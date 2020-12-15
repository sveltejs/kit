import devalue from 'devalue';
import { createReadStream, existsSync } from 'fs';
import * as mime from 'mime';
import fetch, { Response } from 'node-fetch';
import { writable } from 'svelte/store';
import { parse, resolve, URLSearchParams } from 'url';
import { render } from './index';

async function get_response({ request, options, session, route, status = 200, error }) {
	const host = options.host || request.headers[options.host_header];

	const dependencies = {};

	const serialized_session = try_serialize(session, (err) => {
		throw new Error(`Failed to serialize session data: ${err.message}`);
	});

	const serialized_data = [];

	const match = route && route.pattern.exec(request.path);
	const params = route && route.params(match);

	const page = {
		host,
		path: request.path,
		query: request.query,
		params
	};

	const load_context = {
		page,
		session,
		fetch: async (url, opts = {}) => {
			const parsed = parse(url);

			let response;

			if (parsed.protocol) {
				// external fetch
				response = fetch(parsed.href, opts);
			} else {
				// otherwise we're dealing with an internal fetch
				const resolved = resolve(request.path, parsed.pathname);

				if (options.get_static_file) {
					// options.get_static_file should be a function that takes a
					// path relative to `static` and returns a { contents, type }
					// object. `contents` can be a string, buffer or stream
					const file = options.get_static_file(resolved.slice(1));
					if (file) {
						response = new Response(file.contents, {
							headers: {
								'content-type': file.type
							}
						});
					}
				}

				if (!response) {
					const rendered = await render(
						{
							host: request.host,
							method: opts.method || 'GET',
							headers: opts.headers || {}, // TODO inject credentials...
							path: resolved,
							body: opts.body,
							query: new URLSearchParams(parsed.query || '')
						},
						options
					);

					if (rendered) {
						// TODO this is primarily for the benefit of the static case,
						// but could it be used elsewhere?
						dependencies[resolved] = rendered;

						response = new Response(rendered.body, {
							status: rendered.status,
							headers: rendered.headers
						});
					}
				}

				const rendered = await render(
					{
						host: request.host,
						method: opts.method || 'GET',
						headers: opts.headers || {}, // TODO inject credentials...
						path: resolved,
						body: opts.body,
						query: new URLSearchParams(parsed.query || '')
					},
					options
				);

				if (rendered) {
					// TODO this is primarily for the benefit of the static case,
					// but could it be used elsewhere?
					dependencies[resolved] = rendered;

					response = new Response(rendered.body, {
						status: rendered.status,
						headers: rendered.headers
					});
				}
			}

			if (response) {
				const clone = response.clone();

				const headers = {};
				clone.headers.forEach((value, key) => {
					if (key !== 'etag') headers[key] = value;
				});

				const payload = JSON.stringify({
					status: clone.status,
					statusText: clone.statusText,
					headers,
					body: await clone.text() // TODO handle binary data
				});

				// TODO i guess we need to sanitize/escape this... somehow?
				serialized_data.push({ url, payload });

				return response;
			}

			return new Response('Not found', {
				status: 404
			});
		}
	};

	const parts = error ? [options.manifest.layout] : [options.manifest.layout, ...route.parts];

	const component_promises = parts.map((loader) => loader());
	const components = [];
	const props_promises = [];

	let context = {};
	let maxage;

	for (let i = 0; i < component_promises.length; i += 1) {
		const mod = await component_promises[i];
		components[i] = mod.default;

		if (options.only_prerender && !mod.prerender) {
			return;
		}

		const loaded =
			mod.load &&
			(await mod.load.call(null, {
				...load_context,
				context: { ...context }
			}));

		if (loaded) {
			if (loaded.error) {
				const error = new Error(loaded.error.message);
				error.status = loaded.error.status;
				throw error;
			}

			if (loaded.redirect) {
				return {
					status: loaded.redirect.status,
					headers: {
						location: loaded.redirect.to
					}
				};
			}

			if (loaded.context) {
				context = {
					...context,
					...loaded.context
				};
			}

			// TODO use this
			maxage = loaded.maxage || 0;

			props_promises[i] = loaded.props;
		}
	}

	const props = {
		status,
		error,
		stores: {
			page: writable(null),
			navigating: writable(false),
			session: writable(session)
		},
		page,
		components
	};

	// leveln (instead of levels[n]) makes it easy to avoid
	// unnecessary updates for layout components
	for (let i = 0; i < props_promises.length; i += 1) {
		props[`props_${i}`] = await props_promises[i];
	}

	const rendered = options.root.render(props);

	const deps = options.client.deps;
	const js_deps = new Set(deps.__entry__ ? [...deps.__entry__.js] : []);
	const css_deps = new Set(deps.__entry__ ? [...deps.__entry__.css] : []);

	if (route) {
		// TODO handle error page deps
		route.parts.filter(Boolean).forEach((part) => {
			const page_deps = deps[part.name];

			if (!page_deps) return; // we don't have this info during dev

			page_deps.js.forEach((dep) => js_deps.add(dep));
			page_deps.css.forEach((dep) => css_deps.add(dep));
		});
	}

	const path_to = (asset) =>
		`${options.paths.assets}/${options.app_dir}/${asset}`.replace(/^\/\./, '');

	const entry = path_to(options.client.entry);

	const s = JSON.stringify;

	const head = `${rendered.head}
			${Array.from(js_deps)
				.map((dep) => `<link rel="modulepreload" href="${path_to(dep)}">`)
				.join('\n\t\t\t')}
			${Array.from(css_deps)
				.map((dep) => `<link rel="stylesheet" href="${path_to(dep)}">`)
				.join('\n\t\t\t')}
			${options.dev ? `<style>${rendered.css.code}</style>` : ''}

			<script type="module">
				import { start } from '${entry}';
				${options.start_global ? `window.${options.start_global} = () => ` : ''}start({
					target: ${options.target ? `document.querySelector(${s(options.target)})` : 'document.body'},
					host: ${host ? s(host) : 'location.host'},
					paths: ${s(options.paths)},
					status: ${status},
					error: ${serialize_error(error)},
					session: ${serialized_session}
				});
			</script>
	`.replace(/^\t{2}/gm, '');

	const body = `${rendered.html}

			${serialized_data.map(({ url, payload }) => `<script type="svelte-data" url="${url}">${payload}</script>`).join('\n\n\t\t\t')}
		`.replace(/^\t{2}/gm, '');

	return {
		status,
		headers: {
			'content-type': 'text/html'
		},
		body: options.template({ head, body }),
		dependencies
	};
}

export default async function render_page(request, context, options) {
	const route = options.manifest.pages.find((route) => route.pattern.test(request.path));

	const session = await (options.setup.getSession && options.setup.getSession(context));

	try {
		if (!route) {
			const error = new Error(`Not found: ${request.path}`);
			error.status = 404;
			throw error;
		}

		return await get_response({
			request,
			options,
			session,
			route,
			status: 200,
			error: null
		});
	} catch (error) {
		try {
			const status = error.status || 500;

			// TODO sourcemapped stacktrace? https://github.com/sveltejs/kit/pull/266

			return await get_response({
				request,
				options,
				session,
				route,
				status,
				error
			});
		} catch (error) {
			// oh lawd now you've done it
			return {
				status: 500,
				headers: {},
				body: error.stack, // TODO probably not in prod?
				dependencies: {}
			};
		}
	}
}

function try_serialize(data, fail) {
	try {
		return devalue(data);
	} catch (err) {
		if (fail) fail(err);
		return null;
	}
}

// Ensure we return something truthy so the client will not re-render the page over the error
function serialize_error(error) {
	if (!error) return null;
	let serialized = try_serialize(error);
	if (!serialized) {
		const { name, message, stack } = error;
		serialized = try_serialize({ name, message, stack });
	}
	if (!serialized) {
		serialized = '{}';
	}
	return serialized;
}
