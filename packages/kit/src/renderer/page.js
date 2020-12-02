 import devalue from 'devalue';
import { createReadStream, existsSync } from 'fs';
import * as mime from 'mime';
import fetch, { Response } from 'node-fetch';
import { readable, writable } from 'svelte/store';
import { parse, resolve, URLSearchParams } from 'url';
import { render } from './index';

const noop = () => {};

async function get_response({
	request,
	options,
	session,
	page,
	status = 200,
	error
}) {
	let redirected;

	const segments = request.path.split('/').filter(Boolean);

	const base = ''; // TODO

	const dependencies = {};

	const serialized_session = try_serialize(session, (err) => {
		throw new Error(`Failed to serialize session data: ${err.message}`);
	});

	const preload_context = {
		redirect: (status, location) => {
			if (
				redirected &&
				(redirected.status !== status || redirected.headers.location !== location)
			) {
				throw new Error('Conflicting redirects');
			}
			location = location.replace(/^\//g, ''); // leading slash (only)
			redirected = {
				status,
				headers: { location },
				body: null,
				dependencies: {}
			};
		},
		error: (status, error) => {
			if (typeof error === 'string') {
				error = new Error(error);
			}
			error.status = status;
			throw error;
		},
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

	// the last part has all parameters from any segment in the URL
	const params = page ? parts_to_params(match, page.parts[page.parts.length - 1] ) : {};

	const preloaded = [];
	let can_prerender = true;

	const page_parts = error
		? [{ component: options.manifest.error, params: [] }]
		: page.parts;

	const parts = await Promise.all(
		[{ component: options.manifest.layout, params: [] }, ...page_parts].map(async (part, i) => {
			if (!part) return null;

			const mod = await options.load(part.component);

			if (options.only_prerender && !mod.prerender) {
				can_prerender = false;
				return;
			}

			// these are only the parameters up to the current URL segment
			const params = parts_to_params(match, part);

			const props = mod.preload ? await mod.preload.call(
				preload_context,
				{
					host: request.host,
					path: request.path,
					query: request.query,
					params
				},
				session
			) : {};

			preloaded[i] = props;
			return { component: mod.default, props };
		})
	);

	if (options.only_prerender && !can_prerender) return;

	if (redirected) return redirected;

	const props = {
		status,
		error,
		stores: {
			page: writable(null),
			preloading: writable(false),
			session: writable(session)
		},
		page: {
			host: request.host,
			path: request.path,
			query: request.query,
			params,
			error
		},
		components: parts.map(part => part.component)
	};

	// leveln (instead of levels[n]) makes it easy to avoid
	// unnecessary updates for layout components
	parts.forEach((part, i) => {
		props[`props_${i}`] = part.props;
	});

	const serialized_preloads = `[${preloaded
		.map((data) =>
			try_serialize(data, (err) => {
				const path = '/' + segments.join('/');
				console.error(
					`Failed to serialize preloaded data to transmit to the client at the ${path} route: ${err.message}`
				);
				console.warn(
					'The client will re-render over the server-rendered page fresh instead of continuing where it left off. See https://sapper.svelte.dev/docs#Return_value for more information'
				);
			})
		)
		.join(',')}]`;

	const rendered = options.root.render(props);

	const deps = options.client.deps;
	const js_deps = new Set(deps.__entry__ ? [...deps.__entry__.js] : []);
	const css_deps = new Set(deps.__entry__ ? [...deps.__entry__.css] : []);

	if (page) {
		// TODO handle error page deps
		(page.parts.filter(Boolean) ).forEach((part) => {
			const page_deps = deps[part.component.name];

			if (!page_deps) return; // we don't have this info during dev

			page_deps.js.forEach((dep) => js_deps.add(dep));
			page_deps.css.forEach((dep) => css_deps.add(dep));
		});
	}

	const head = `${rendered.head}

			${Array.from(js_deps)
				.map((dep) => `<link rel="modulepreload" href="/_app/${dep}">`)
				.join('\n\t\t\t')}
			${Array.from(css_deps)
				.map((dep) => `<link rel="stylesheet" href="/_app/${dep}">`)
				.join('\n\t\t\t')}
			${options.dev ? `<style>${rendered.css.code}</style>` : ''}
	`.replace(/^\t{2}/gm, ''); // TODO add links

	const body = `${rendered.html}
		<script type="module">
			import { start } from '/_app/${options.client.entry}';
			start({
				target: ${options.target ? `document.querySelector(${JSON.stringify(options.target)})` : 'document.body'},
				base: "${base}",
				status: ${status},
				error: ${serialize_error(error)},
				preloaded: ${serialized_preloads},
				session: ${serialized_session}
			});
		</script>`.replace(/^\t{3}/gm, '');

	return {
		status,
		headers: {
			'content-type': 'text/html'
		},
		body: options.template({ head, body }),
		dependencies
	};
}

export default async function render_page(
	request,
	context,
	options
) {
	const page = options.manifest.pages.find((page) =>
		page.pattern.test(request.path)
	);

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

function parts_to_params(match, part) {
	const params = {};

	part.params.forEach((name, i) => {
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
