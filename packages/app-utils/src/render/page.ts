import { existsSync, createReadStream } from 'fs';
import { writable } from 'svelte/store';
import { parse, resolve } from 'url';
import devalue from 'devalue';
import fetch, { Response } from 'node-fetch';
import * as mime from 'mime';
import { render } from './index';
import { ClientManifest, PageComponentManifest, PageManifest, Query, RouteManifest, ServerRouteManifest } from '../types';

export default async function render_page({
	only_prerender,
	static_dir,
	template,
	manifest,
	client,
	host,
	path,
	query,
	page,
	App,
	load,
	dev // TODO this is awkward
}: {
	only_prerender: boolean;
	static_dir: string;
	template: string;
	manifest: RouteManifest;
	client: ClientManifest;
	host: string;
	path: string;
	query: Query;
	page: PageManifest;
	App: any; // TODO
	load: (route: PageComponentManifest | ServerRouteManifest) => Promise<any>; // TODO
	dev: boolean;
}) {
	let redirected;
	let preload_error;

	const baseUrl = ''; // TODO

	const session = {}; // TODO

	const serialized_session = try_serialize(session, err => {
		throw new Error(`Failed to serialize session data: ${err.message}`);
	});

	try {
		if (!page) {
			const error: any = new Error(`Not found: ${path}`);
			error.status = 404;
			throw error;
		}

		const segments = path.split('/').filter(Boolean);

		// TODO make this less confusing
		const layout_segments = [segments[0]];
		let l = 1;

		page.parts.forEach((part, i) => {
			layout_segments[l] = segments[i + 1];
			if (!part) return;
			l++;
		});

		const dependencies = {};

		const preload_context = {
			redirect: (status, location) => {
				if (redirected && (redirected.status !== status || redirected.location !== location)) {
					throw new Error(`Conflicting redirects`);
				}
				location = location.replace(/^\//g, ''); // leading slash (only)
				redirected = {
					status,
					headers: {
						Location: location
					}
				};
			},
			error: (status, error) => {
				if (typeof error === 'string') {
					error = new Error(error);
				}
				preload_error = { ...error, status };
			},
			fetch: async (url, opts) => {
				const parsed = parse(url);

				if (parsed.protocol) {
					// external fetch
					return fetch(parsed.href, opts);
				}

				// otherwise we're dealing with an internal fetch. TODO there's
				// probably no advantage to using fetch here — we should replace
				// `this.fetch` with `this.load` or whatever

				const resolved = resolve(path, parsed.pathname);

				// edge case — fetching a static file
				const candidates = [`${static_dir}${resolved}`, `${static_dir}${resolved}/index.html`];
				for (const file of candidates) {
					if (existsSync(file)) {
						return new Response(createReadStream(file), {
							headers: {
								'Content-Type': mime.getType(file)
							}
						});
					}
				}

				// TODO this doesn't take account of sent headers, or non-GET methods
				const rendered = await render({
					only_prerender,
					static_dir,
					template,
					manifest,
					client,
					host,
					url: parsed.query ? `${resolved}?${parsed.query}` : resolved,
					dev,
					App,
					load
				});

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

		const match = page.pattern.exec(path);

		// TODO this logic is duplicated in several places
		const params = {};
		page.parts[page.parts.length - 1].params.forEach((name, i) => {
			params[name] = match[i + 1];
		});

		const preloaded = [];
		let can_prerender = true;

		const parts = await Promise.all([{ component: manifest.layout, params: [] }, ...page.parts].map(async (part, i) => {
			if (!part) return null;

			const mod = await load(part.component);

			if (only_prerender && !mod.prerender) {
				can_prerender = false;
				return;
			}

			const params = {};
			part.params.forEach((name, i) => {
				params[name] = match[i + 1];
			});

			const props = mod.preload
				? await mod.preload.call(preload_context, {
					host,
					path,
					query,
					params
				}, session)
				: {};

			preloaded[i] = props;
			return { component: mod.default, props };
		}));

		if (only_prerender && !can_prerender) return;

		if (preload_error) throw preload_error;
		if (redirected) return redirected;

		const branches = [];
		parts.forEach((part, i) => {
			if (part) {
				branches.push({
					component: part.component,
					props: preloaded[i],
					segment: segments[i]
				});
			}
		});

		const props = {
			status: 200,
			error: null,
			stores: {
				page: {
					subscribe: writable({
						host,
						path,
						query,
						params
					}).subscribe
				},
				preloading: {
					subscribe: writable(null).subscribe
				},
				session: writable(session)
			},
			// TODO stores, status, segments, notify, CONTEXT_KEY
			segments: layout_segments,
			branches: branches,
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

		const serialized_preloads = `[${preloaded.map(data => try_serialize(data, err => {
			console.error(`Failed to serialize preloaded data to transmit to the client at the /${segments.join('/')} route: ${err.message}`);
			console.warn('The client will re-render over the server-rendered page fresh instead of continuing where it left off. See https://sapper.svelte.dev/docs#Return_value for more information');
		})).join(',')}]`;

		const rendered = App.default.render(props);

		const js_deps = new Set(client.deps.__entry__ ? [...client.deps.__entry__.js] : []);
		const css_deps = new Set(client.deps.__entry__ ? [...client.deps.__entry__.css] : []);

		page.parts.filter(Boolean).forEach(part => {
			const deps = client.deps[part.component.name];

			if (!deps) return; // we don't have this info during dev

			deps.js.forEach(dep => js_deps.add(dep));
			deps.css.forEach(dep => css_deps.add(dep));
		});

		const head = `${rendered.head}
			${Array.from(js_deps).map(dep => `<link rel="modulepreload" href="/_app/${dep}">`).join('\n\t\t\t')}
			${Array.from(css_deps).map(dep => `<link rel="stylesheet" href="/_app/${dep}">`).join('\n\t\t\t')}
			${dev ? `<style>${rendered.css.code}</style>` : ''}
			<script type="module">
				import { start } from '/_app/${client.entry}';

				start({
					target: document.body
				});
			</script>`.replace(/^\t\t\t/gm, ''); // TODO add links

		const body = `${rendered.html}
			<script>
				__SVELTE__ = {
					baseUrl: "${baseUrl}",
					status: 200,
					error: null,
					preloaded: ${serialized_preloads},
					session: ${serialized_session}
				};
			</script>`.replace(/^\t\t\t/gm, '');

		const html = template.replace('%svelte.head%', head).replace('%svelte.body%', body);

		return {
			status: 200,
			headers: {
				'Content-Type': 'text/html'
			},
			body: html,
			dependencies
		};
	} catch (error) {
		console.error(error.stack);

		const status = error.status || 500;

		try {
			const rendered = App.default.render({ status, error });

			const head = `${rendered.head}
				<script type="module">
					import { start } from '/_app/${client.entry}';

					start({
						target: document.body
					});
				</script>`.replace(/^\t\t\t/gm, '');

			const body = `${rendered.html}
				<script>
					__SVELTE__ = {
						baseUrl: "${baseUrl}",
						status: ${status},
						error: ${serialize_error(error)},
						preloaded: null,
						session: ${serialized_session}
					};
				</script>`.replace(/^\t\t\t/gm, '');

			const html = template
				.replace('%svelte.head%', head)
				.replace('%svelte.body%', body);

			return {
				status,
				headers: {
					'Content-Type': 'text/html'
				},
				body: html
			};
		} catch (error) {
			// oh lawd now you've done it
			return {
				status: 500,
				body: error.stack, // TODO probably not in prod?
			};
		}
	}
}

function try_serialize(data, fail?) {
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
		const { name, message, stack } = error ;
		serialized = try_serialize({ name, message, stack });
	}
	if (!serialized) {
		serialized = '{}';
	}
	return serialized;
}