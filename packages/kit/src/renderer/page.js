import devalue from 'devalue';
import { createReadStream, existsSync } from 'fs';
import * as mime from 'mime';
import fetch, { Response } from 'node-fetch';
import { writable } from 'svelte/store';
import { parse, resolve, URLSearchParams } from 'url';
import { render } from './index';

async function get_response({ request, options, session, page, status = 200, error }) {
	const host = options.host || request.headers[options.host_header];

	const dependencies = {};

	const serialized_session = try_serialize(session, (err) => {
		throw new Error(`Failed to serialize session data: ${err.message}`);
	});

	const serialized_data = [];

	const load_context = {
		page, // TODO `...page` or `page`? https://github.com/sveltejs/kit/issues/268#issuecomment-744050319
		session,
		fetch: async (url, opts = {}) => {
			const parsed = parse(url);

			if (parsed.protocol) {
				// external fetch
				return fetch(parsed.href, opts);
			}

			// otherwise we're dealing with an internal fetch. TODO there's
			// probably no advantage to using fetch here — we should replace
			// `this.fetch` with `this.load` or whatever

			const resolved = resolve(request.path, parsed.pathname);

			// edge case — fetching a static file
			const candidates = [
				`${options.static_dir}${resolved}`,
				`${options.static_dir}${resolved}/index.html`
			];
			for (const file of candidates) {
				if (existsSync(file)) {
					return new Response(createReadStream(file), {
						headers: {
							'content-type': mime.getType(file)
						}
					});
				}
			}

			// TODO this doesn't take account of opts.body
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

				return new Response(rendered.body, {
					status: rendered.status,
					headers: rendered.headers
				});
			} else {
				return new Response('Not found', {
					status: 404
				});
			}
		}
	};

	const match = page && page.pattern.exec(request.path);
	const params = page && parts_to_params(match, page.params);

	const parts = error
		? [options.manifest.layout]
		: [options.manifest.layout, ...page.parts];

	const component_promises = parts.map(part => options.load(part));
	const components = [];
	const props_promises = [];

	let context = {};
	let load_error;
	let maxage;

	for (let i = 0; i < component_promises.length; i += 1) {
		const mod = await component_promises[i];
		components[i] = mod.default;

		if (options.only_prerender && !mod.prerender) {
			return;
		}

		const loaded = mod.load && await mod.load.call(null, {
			...load_context,
			context: { ...context }
		});

		if (loaded) {
			if (loaded.error) {
				load_error = loaded.error;
				break;
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
		page: {
			host: host || request.headers.host,
			path: request.path,
			query: request.query,
			params
		},
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

	if (page) {
		// TODO handle error page deps
		page.parts.filter(Boolean).forEach((part) => {
			const page_deps = deps[part.name];

			if (!page_deps) return; // we don't have this info during dev

			page_deps.js.forEach((dep) => js_deps.add(dep));
			page_deps.css.forEach((dep) => css_deps.add(dep));
		});
	}

	const path_to = (asset) =>
		`${options.paths.assets}/${options.app_dir}/${asset}`.replace(/^\/\./, '');

	const entry = path_to(options.client.entry);

	const head = `${rendered.head}

			${Array.from(js_deps)
				.map((dep) => `<link rel="modulepreload" href="${path_to(dep)}">`)
				.join('\n\t\t\t')}
			${Array.from(css_deps)
				.map((dep) => `<link rel="stylesheet" href="${path_to(dep)}">`)
				.join('\n\t\t\t')}
			${options.dev ? `<style>${rendered.css.code}</style>` : ''}
	`.replace(/^\t{2}/gm, '');

	const s = JSON.stringify;

	const body = `${rendered.html}
		<script type="module">
			import { start } from '${entry}';
			${options.start_global ? `window.${options.start_global} = () => ` : ''}start({
				target: ${options.target ? `document.querySelector(${s(options.target)})` : 'document.body'},
				host: ${host ? s(host) : 'location.host'},
				paths: ${s(options.paths)},
				status: ${status},
				error: ${serialize_error(error)},
				preloaded: [], // TODO replace with serialized_data
				session: ${serialized_session}
			});
		</script>`.replace(/^\t{2}/gm, '');

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
	const page = options.manifest.pages.find((page) => page.pattern.test(request.path));

	const session = await (options.setup.getSession && options.setup.getSession(context));

	try {
		if (!page) {
			const error = new Error(`Not found: ${request.path}`);
			error.status = 404;
			throw error;
		}

		return await get_response({
			request,
			options,
			session,
			page,
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
				page,
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

function parts_to_params(match, array) {
	const params = {};

	array.forEach((name, i) => {
		const is_spread = /^\.{3}.+$/.test(name);

		if (is_spread) {
			params[name.slice(3)] = match[i + 1].split('/');
		} else {
			params[name] = match[i + 1];
		}
	});

	return params;
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
