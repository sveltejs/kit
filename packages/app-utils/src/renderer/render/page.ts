import devalue from 'devalue';
import { createReadStream, existsSync } from 'fs';
import * as mime from 'mime';
import fetch, { Response } from 'node-fetch';
import { readable, writable } from 'svelte/store';
import { parse, resolve, URLSearchParams } from 'url';
import {
	EndpointResponse,
	Headers,
	IncomingRequest,
	PageContext,
	PageManifest,
	PageManifestPart,
	PageResponse,
	RenderOptions,
	RouteParams
} from '../../types';
import { render } from './index';

const noop = () => {};

type FetchOpts = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
	headers?: Headers;
	body?: any;
};

export default async function render_page(
	request: IncomingRequest,
	context: any,
	options: RenderOptions,
	status: number = 200,
	error: Error | null = null
): Promise<{
	status: number,
	body: string,
	headers: Headers,
	dependencies: Record<string, EndpointResponse>
} | undefined> {
	let redirected: PageResponse;
	let preload_error;

	const page: PageManifest | undefined = options.manifest.pages.find(page => page.pattern.test(request.path));

	const baseUrl = ''; // TODO

	const session = await options.setup.getSession?.(context);

	const serialized_session = try_serialize(session, (err: Error) => {
		throw new Error(`Failed to serialize session data: ${err.message}`);
	});

	try {
		if (!page) {
			const error: any = new Error(`Not found: ${request.path}`);
			error.status = 404;
			throw error;
		}

		const segments = request.path.split('/').filter(Boolean);

		// TODO make this less confusing
		const layout_segments = [segments[0]];
		let l = 1;

		page.parts.forEach((part, i) => {
			layout_segments[l] = segments[i + 1];
			if (!part) return;
			l++;
		});

		const dependencies: Record<string, EndpointResponse> = {};

		const preload_context = {
			redirect: (status: number, location: string) => {
				if (redirected && (redirected.status !== status || redirected.headers.location !== location)) {
					throw new Error(`Conflicting redirects`);
				}
				location = location.replace(/^\//g, ''); // leading slash (only)
				redirected = {
					status,
					headers: { location },
					body: null,
					dependencies: {}
				};
			},
			error: (status: number, error: Error | string) => {
				if (typeof error === 'string') {
					error = new Error(error);
				}
				preload_error = { ...error, status };
			},
			fetch: async (url: string, opts: FetchOpts = {}) => {
				const parsed = parse(url);

				if (parsed.protocol) {
					// external fetch
					return fetch(parsed.href, opts);
				}

				// otherwise we're dealing with an internal fetch. TODO there's
				// probably no advantage to using fetch here — we should replace
				// `this.fetch` with `this.load` or whatever

				const resolved = resolve(request.path, parsed.pathname!);

				// edge case — fetching a static file
				const candidates = [`${options.static_dir}${resolved}`, `${options.static_dir}${resolved}/index.html`];
				for (const file of candidates) {
					if (existsSync(file)) {
						return new Response(createReadStream(file), {
							headers: {
								'content-type': mime.getType(file)!
							}
						});
					}
				}

				// TODO this doesn't take account of opts.body
				const rendered = await render({
					host: request.host,
					method: opts.method || 'GET',
					headers: opts.headers || {}, // TODO inject credentials...
					path: resolved,
					body: opts.body,
					query: new URLSearchParams(parsed.query || '')
				}, options);

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

		const match = page.pattern.exec(request.path)!;

		// the last part has all parameters from any segment in the URL
		const params = parts_to_params(match, page.parts[page.parts.length - 1] as PageManifestPart)

		const preloaded: any[] = [];
		let can_prerender = true;

		const parts = await Promise.all([{ component: options.manifest.layout, params: [] }, ...page.parts].map(async (part, i) => {
			if (!part) return null;

			const mod = await options.load(part.component);

			if (options.only_prerender && !mod.prerender) {
				can_prerender = false;
				return;
			}

			// these are only the parameters up to the current URL segment
			const params = parts_to_params(match, part)

			const props = mod.preload
				? await mod.preload.call(preload_context, {
					host: request.host,
					path: request.path,
					query: request.query,
					params
				}, session)
				: {};

			preloaded[i] = props;
			return { component: mod.default, props };
		}));

		if (options.only_prerender && !can_prerender) return;

		if (preload_error) throw preload_error;
		if (redirected!) return redirected!;

		const branches: Array<{
			component: any; // TODO
			props: any;
			segment: string;
		}> = [];
		parts.forEach((part, i) => {
			if (part) {
				branches.push({
					component: part.component,
					props: preloaded[i],
					segment: segments[i]
				});
			}
		});

		const pageContext: PageContext = {
			host: request.host as string,
			path: request.path,
			query: search_params_to_map(request.query),
			params,
			error: error || undefined
		};

		const props: Record<string, any> = {
			status,
			error,
			stores: {
				page: readable(pageContext, noop),
				preloading: readable(null, noop),
				session: writable(session)
			},
			// TODO stores, status, segments, notify, CONTEXT_KEY
			segments: layout_segments,
			branches,
			level0: {
				props: preloaded[0]
			},
			level1: {
				segment: segments[0],
				props: {}
			}
		};

		// TODO this is highly confusing. replace the leveln thing with an array of branches
		l = 1;
		for (let i = 1; i < parts.length; i += 1) {
			const part = parts[i];
			if (!part) continue;

			props[`level${l++}`] = {
				component: part.component,
				props: preloaded[i] || {},
				segment: segments[i]
			};
		}

		const serialized_preloads = `[${preloaded.map(data => try_serialize(data, (err: Error) => {
			console.error(`Failed to serialize preloaded data to transmit to the client at the /${segments.join('/')} route: ${err.message}`);
			console.warn('The client will re-render over the server-rendered page fresh instead of continuing where it left off. See https://sapper.svelte.dev/docs#Return_value for more information');
		})).join(',')}]`;

		const rendered = options.root.default.render(props);

		const js_deps = new Set(options.client.deps.__entry__ ? [...options.client.deps.__entry__.js] : []);
		const css_deps = new Set(options.client.deps.__entry__ ? [...options.client.deps.__entry__.css] : []);

		(page.parts.filter(Boolean) as PageManifestPart[]).forEach(part => {
			const deps = options.client.deps[part.component.name];

			if (!deps) return; // we don't have this info during dev

			deps.js.forEach(dep => js_deps.add(dep));
			deps.css.forEach(dep => css_deps.add(dep));
		});

		const head = `${rendered.head}

			${Array.from(js_deps).map(dep => `<link rel="modulepreload" href="/_app/${dep}">`).join('\n\t\t\t')}
			${Array.from(css_deps).map(dep => `<link rel="stylesheet" href="/_app/${dep}">`).join('\n\t\t\t')}
			${options.dev ? `<style>${rendered.css.code}</style>` : ''}

			<script type="module">
				import { start } from '/_app/${options.client.entry}';

				start({
					target: document.querySelector('#svelte') || document.body
				});
			</script>`.replace(/^\t{2}/gm, ''); // TODO add links

		const body = `${rendered.html}
			<script>
				__SVELTE__ = {
					baseUrl: "${baseUrl}",
					status: ${status},
					error: ${serialize_error(error)},
					preloaded: ${serialized_preloads},
					session: ${serialized_session}
				};
			</script>`.replace(/^\t{3}/gm, '');

		const html = options.template.replace('%svelte.head%', head).replace('%svelte.body%', body);

		return {
			status: 200,
			headers: {
				'content-type': 'text/html'
			},
			body: html,
			dependencies
		};
	} catch (thrown) {
		console.error(thrown.stack);

		if (!error) {
			const status = thrown.status || 500;
			return render_page(request, context, options, status, thrown);
		} else {
			// oh lawd now you've done it
			return {
				status: 500,
				headers: {},
				body: thrown.stack, // TODO probably not in prod?
				dependencies: {}
			};
		}
	}
}

function parts_to_params(match: RegExpMatchArray, part: PageManifestPart): RouteParams {
	const params: RouteParams = {};

	part.params.forEach((name, i) => {
		const is_spread = /^\.{3}.+$/.test(name)

		if (is_spread) {
			params[name.slice(3)] = match[i + 1].split('/');
		} else {
			params[name] = match[i + 1];
		}
	});

	return params;
}

function try_serialize(data: any, fail?: (err: Error) => void) {
	try {
		return devalue(data);
	} catch (err) {
		if (fail) fail(err);
		return null;
	}
}

// Ensure we return something truthy so the client will not re-render the page over the error
function serialize_error(error?: Error|null) {
	if (!error) return null;
	let serialized = try_serialize(error);
	if (!serialized) {
		const { name, message, stack } = error ;
		serialized = try_serialize({ name, message, stack });
	}
	if (!serialized) {
		serialized = '{}';
	}
	return serialized;
}

function search_params_to_map(params: URLSearchParams) {
	const map: Record<string, string | string[]> = {};

	for (const key of params.keys()) {
		const values = params.getAll(key);

		map[key] = values.length > 1 ? values : values[0];
	}

	return map;
}
