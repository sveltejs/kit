/** @import { Component } from 'svelte'; */
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { isRedirect, text } from '@sveltejs/kit';
import * as paths from '$app/paths/internal/server';
import { hash } from '../../../utils/hash.js';
import { serialize_data } from './serialize_data.js';
import { s } from '../../../utils/misc.js';
import { Csp } from './csp.js';
import { uneval_action_response } from './actions.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import { SCHEME } from '../../../utils/url.js';
import { create_server_routing_response, generate_route_object } from './server_routing.js';
import {
	add_data_suffix,
	add_resolution_suffix,
	route_id_resolution_pathname
} from '../../pathname.js';
import { try_get_request_store, with_request_store } from '@sveltejs/kit/internal/server';
import { text_encoder } from '../../utils.js';
import { count_non_ssi_comments, get_global_name } from '../utils.js';
import { handle_error_and_jsonify } from '../errors.js';
import * as env from '__sveltekit/env';
import { collect_remote_data } from '../remote-functions.js';
import Root from '../../components/root.svelte';
import { render } from 'svelte/server';
import { Props, RenderNode } from '../../props.svelte.js';
import { has_custom_transporters, uneval } from '#app/internal/transport';

// TODO rename this function/module

/**
 * Creates the HTML response.
 * @param {{
 *   branch: Array<import('./types.js').Loaded>;
 *   fetched: Array<import('./types.js').Fetched>;
 *   options: import('types').SSROptions;
 *   manifest: import('@sveltejs/kit').SSRManifest;
 *   page_config: { ssr: boolean; csr: boolean };
 *   status: number;
 *   error: App.Error | null;
 *   event: import('@sveltejs/kit').RequestEvent;
 *   state: import('types').RequestState;
 *   resolve_opts: import('types').RequiredResolveOptions;
 *   action_result?: import('@sveltejs/kit').ActionResult;
 *   data_serializer: import('./types.js').ServerDataSerializer;
 *   error_components?: Array<import('svelte').Component | undefined>
 * }} opts
 */
export async function render_response({
	branch,
	fetched,
	options,
	manifest,
	page_config,
	status,
	error = null,
	event,
	state,
	resolve_opts,
	action_result,
	data_serializer,
	error_components
}) {
	if (state.prerendering) {
		if (options.csp.mode === 'nonce') {
			throw new Error('Cannot use prerendering if config.csp.mode === "nonce"');
		}

		if (options.app_template_contains_nonce) {
			throw new Error('Cannot use prerendering if page template contains %sveltekit.nonce%');
		}
	}

	const { client } = manifest._;

	const modulepreloads = new Set(client?.imports);
	const stylesheets = new Set(client?.stylesheets);
	const fonts = new Set(client?.fonts);

	/**
	 * The value of the Link header that is added to the response when not prerendering
	 * @type {Set<string>}
	 */
	const link_headers = new Set();

	/** @type {Map<string, string>} */
	// TODO if we add a client entry point one day, we will need to include inline_styles with the entry, otherwise stylesheets will be linked even if they are below inlineStyleThreshold
	const inline_styles = new Map();

	// TODO `svelte/server` should expose `RenderOutput`
	/** @type {{ head: string, body: string, hashes: { script: string[] } }} */
	let rendered;

	const form_value =
		action_result?.type === 'success' || action_result?.type === 'failure'
			? (action_result.data ?? null)
			: null;

	/** @type {string} */
	let base = paths.base;

	/** @type {string} */
	let assets = paths.assets;

	/**
	 * An expression that will evaluate in the client to determine the resolved base path.
	 * We use a relative path when possible to support IPFS, the internet archive, etc.
	 */
	let base_expression = s(paths.base);

	const csp = new Csp(options.csp, {
		prerender: !!state.prerendering
	});

	// if appropriate, use relative paths for greater portability
	if (paths.relative) {
		if (!state.prerendering?.fallback) {
			// the relative path depth must reflect the URL the browser is actually at, which
			// for a data request includes the `__data.json` suffix that was stripped during routing
			const pathname = event.isDataRequest
				? add_data_suffix(event.url.pathname)
				: event.url.pathname;
			const segments = pathname.slice(paths.base.length).split('/').slice(2);

			base = segments.map(() => '..').join('/') || '.';

			// resolve e.g. '../..' against current location, then remove trailing slash
			base_expression = `new URL(${s(base)}, location).pathname.slice(0, -1)`;

			if (!paths.assets || (paths.assets[0] === '/' && paths.assets !== SVELTE_KIT_ASSETS)) {
				assets = base;
			}
		} else if (options.hash_routing) {
			// we have to assume that we're in the right place
			base_expression = "new URL('.', location).pathname.slice(0, -1)";
		}
	}

	if (page_config.ssr) {
		const page = {
			error,
			params: /** @type {Record<string, any>} */ (event.params),
			route: event.route,
			status,
			url: event.url,
			data: {},
			form: form_value,
			shallow: null,
			state: {}
		};

		const props = new Props({
			page,
			tree: new RenderNode(
				// TODO tidy up
				/** @type {Component} */ (await branch[0].node.component?.()),
				/** @type {Component} */ (error_components?.[1])
			),
			form: form_value,
			error: error ?? undefined
		});

		let current_node = props.tree;
		let data = props.page.data;

		for (let i = 0; i < branch.length; i += 1) {
			const node = branch[i];

			data = { ...data, ...node.data };

			current_node.data = data;

			if (i < branch.length - 1) {
				current_node = current_node.child = new RenderNode(
					// TODO tidy up
					/** @type {Component} */ (await branch[i + 1].node.component?.()),
					/** @type {Component} */ (error_components?.slice(0, i + 2).findLast((x) => x))
				);
			}
		}

		props.page.data = data;

		const render_state = { ...state, is_in_render: true };

		const render_opts = {
			context: new Map([
				[
					'__request__',
					{
						page: props.page
					}
				]
			]),
			csp: csp.script_needs_nonce ? { nonce: csp.nonce } : { hash: csp.script_needs_hash },
			transformError: error_components
				? /** @param {unknown} e */ (e) => {
						if (isRedirect(e)) {
							throw e;
						}

						const handled = handle_error_and_jsonify(event, render_state, options, e);

						// TODO 4.0 make this an async function and await `handled`
						if (handled instanceof Promise) {
							return handled.then((e) => {
								error = e;
								props.page.error = error;
								props.page.status = status = error.status;
								return error;
							});
						}

						error = handled;
						props.page.error = error;
						props.page.status = status = error.status;

						return error;
					}
				: undefined
		};

		const fetch = globalThis.fetch;

		try {
			if (DEV) {
				let warned = false;
				globalThis.fetch = (info, init) => {
					if (typeof info === 'string' && !SCHEME.test(info)) {
						throw new Error(
							`Cannot call \`fetch\` eagerly during server-side rendering with relative URL (${info}) — put your \`fetch\` calls inside \`onMount\` or a \`load\` function instead`
						);
					} else if (!warned && !try_get_request_store()?.state.is_in_remote_function) {
						console.warn(
							'Avoid calling `fetch` eagerly during server-side rendering — put your `fetch` calls inside `onMount` or a `load` function instead'
						);
						warned = true;
					}

					return fetch(info, init);
				};
			}

			rendered = await with_request_store({ event, state: render_state }, async () => {
				// We have to invoke .then eagerly here in order to kick off rendering: it's only starting on access,
				// and `await maybe_promise` would eagerly access the .then property but call its function only after a tick, which is too late
				// for the paths.reset() below and for any eager getRequestEvent() calls during rendering without AsyncLocalStorage available.
				const rendered = render(Root, { ...render_opts, props });

				const { head, body, hashes } = await rendered;

				if (hashes) {
					csp.add_script_hashes(hashes.script);
				}

				return { head, body, hashes };
			});
		} finally {
			if (DEV) {
				globalThis.fetch = fetch;
			}
		}
	} else {
		rendered = { head: '', body: '', hashes: { script: [] } };
	}

	for (const { node } of branch) {
		for (const url of node.imports) modulepreloads.add(url);
		for (const url of node.stylesheets) stylesheets.add(url);
		for (const url of node.fonts) fonts.add(url);

		if (node.inline_styles && !client?.inline) {
			Object.entries(await node.inline_styles()).forEach(([filename, css]) => {
				if (typeof css === 'string') {
					inline_styles.set(filename, css);
					return;
				}

				inline_styles.set(filename, css(`${assets}/${paths.app_dir}/immutable/assets`, assets));
			});
		}
	}

	const head = new Head(rendered.head);
	let body = rendered.body;

	/** @param {string} path */
	const prefixed = (path) => {
		if (path.startsWith('/')) {
			// Vite makes the start script available through the base path and without it.
			// We load it via the base path in order to support remote IDE environments which proxy
			// all URLs under the base path during development.
			return paths.base + path;
		}
		return `${assets}/${path}`;
	};

	const style = client?.inline
		? client.inline?.style
		: Array.from(inline_styles.values()).join('\n');

	if (style) {
		// We always inline all styles to avoid FOUC during development.
		// Once that's accomplished, we find and remove the style node using the
		// `data-sveltekit` attribute once CSR kicks in
		const attributes = __SVELTEKIT_DEV__ ? ['data-sveltekit'] : [];
		if (csp.style_needs_nonce) attributes.push(`nonce="${csp.nonce}"`);
		csp.add_style(style);
		head.add_style(style, attributes);
	}

	/**
	 * see the `output.linkHeaderPreload` option for details on why we have multiple options here
	 * @param {string} path
	 * @param {string[]} attributes
	 */
	const add_preload = (path, attributes) => {
		if (options.link_header_preload && !state.prerendering) {
			link_headers.add(`<${encodeURI(path)}>; ${attributes.join('; ')}; nopush`);
		} else {
			head.add_link_tag(path, attributes);
		}
	};

	for (const dep of stylesheets) {
		const path = prefixed(dep);

		const attributes = ['rel="stylesheet"'];

		if (inline_styles.has(dep)) {
			// don't load stylesheets that are already inlined
			// include them in disabled state so that Vite can detect them and doesn't try to add them
			attributes.push('disabled', 'media="(max-width: 0)"');
		} else {
			if (options.link_header_preload && resolve_opts.preload({ type: 'css', path })) {
				link_headers.add(`<${encodeURI(path)}>; rel="preload"; as="style"; nopush`);
			}
		}

		head.add_stylesheet(path, attributes);
	}

	for (const dep of fonts) {
		const path = prefixed(dep);

		if (resolve_opts.preload({ type: 'font', path })) {
			const ext = dep.slice(dep.lastIndexOf('.') + 1);

			add_preload(path, ['rel="preload"', 'as="font"', `type="font/${ext}"`, 'crossorigin']);
		}
	}

	const global = get_global_name(options);
	const { data, chunks } = data_serializer.get_data(csp);

	if (page_config.ssr && page_config.csr) {
		body += `\n\t\t\t${fetched
			.map((item) =>
				serialize_data(item, resolve_opts.filterSerializedResponseHeaders, !!state.prerendering)
			)
			.join('\n\t\t\t')}`;
	}

	if (page_config.csr && client) {
		const route = client.routes?.find((r) => r.id === event.route.id) ?? null;

		// when serving a prerendered page in an app that uses runtime public env vars, we must
		// import the env.js module so that it evaluates before any user code can evaluate.
		// TODO revert to using top-level await once https://bugs.webkit.org/show_bug.cgi?id=242740 is fixed
		// https://github.com/sveltejs/kit/pull/11601
		const load_env_eagerly = client.uses_env_dynamic_public && !!state.prerendering;

		if (load_env_eagerly) {
			modulepreloads.add(`${paths.app_dir}/env.js`);
		}

		if (!client.inline) {
			for (const dep of modulepreloads) {
				const path = prefixed(dep);

				if (resolve_opts.preload({ type: 'js', path })) {
					add_preload(path, ['rel="modulepreload"']);
				}
			}
		}

		// prerender a `/path/to/page/__route.js` module
		if (client.routes && state.prerendering && !state.prerendering.fallback) {
			const pathname = add_resolution_suffix(event.url.pathname);

			state.prerendering.dependencies.set(
				pathname,
				create_server_routing_response(route, event.params, new URL(pathname, event.url), client)
			);

			// Prerender a route-ID-keyed `/_app/routes/<id>/__route.js` module alongside the
			// pathname-keyed one above, so that `preloadCode(id)` can resolve a route ID without
			// hitting the server.
			if (route && !state.prerendering.resolved_route_ids.has(route.id)) {
				state.prerendering.resolved_route_ids.add(route.id);

				const id_pathname = paths.base + route_id_resolution_pathname(paths.app_dir, route.id);

				state.prerendering.dependencies.set(
					id_pathname,
					create_server_routing_response(route, null, new URL(id_pathname, event.url), client)
				);
			}
		}

		const blocks = [];

		const properties = [`base: ${base_expression}`, `version: ${s(__SVELTEKIT_APP_VERSION__)}`];

		if (paths.assets) {
			properties.push(`assets: ${s(paths.assets)}`);
		}

		if (client.uses_env_dynamic_public) {
			properties.push(`env: ${load_env_eagerly ? 'null' : devalue.uneval(env.rendered_env)}`);
		}

		if (chunks) {
			blocks.push('const deferred = new Map();');

			properties.push(`defer: (id) => new Promise((fulfil, reject) => {
							deferred.set(id, { fulfil, reject });
						})`);

			let app_declaration = '';

			if (has_custom_transporters) {
				if (client.inline) {
					app_declaration = `const app = ${global}.app.app;`;
				} else if (client.app) {
					app_declaration = `const kit = await import(${s(prefixed(client.start))});
							kit.init(${global});
							const app = await import(${s(prefixed(client.app))});`;
				} else {
					app_declaration = `const { app } = await import(${s(prefixed(client.start))});`;
				}
			}

			const prelude = app_declaration
				? `${app_declaration}
							const [data, error] = fn(app);`
				: `const [data, error] = fn();`;

			// When resolving, the id might not yet be available due to the data
			// be evaluated upon init of kit, so we use a timeout to retry
			properties.push(`resolve: async (id, fn) => {
							${prelude}

							const try_to_resolve = () => {
								if (!deferred.has(id)) {
									setTimeout(try_to_resolve, 0);
									return;
								}
								const { fulfil, reject } = deferred.get(id);
								deferred.delete(id);
								if (error) reject(error);
								else fulfil(data);
							}
							try_to_resolve();
						}`);
		}

		// create this before declaring `data`, which may contain references to `${global}`
		blocks.push(`${global} = {
						${properties.join(',\n\t\t\t\t\t\t')}
					};`);

		const args = ['element'];

		blocks.push('const element = document.currentScript.parentElement;');

		if (page_config.ssr) {
			const serialized = { form: 'null', error: 'null' };

			if (form_value) {
				serialized.form = uneval_action_response(
					form_value,
					/** @type {string} */ (event.route.id)
				);
			}

			if (error) {
				serialized.error = devalue.uneval(error);
			}

			const hydrate = [
				`node_ids: [${branch.map(({ node }) => node.index).join(', ')}]`,
				`data: ${data}`,
				`form: ${serialized.form}`,
				`error: ${serialized.error}`
			];

			if (status !== 200 && !error) {
				hydrate.push(`status: ${status}`);
			}

			if (client.routes) {
				if (route) {
					const stringified = generate_route_object(route, event.url, client).replaceAll(
						'\n',
						'\n\t\t\t\t\t\t\t'
					); // make output after it's put together with the rest more readable
					hydrate.push(`params: ${devalue.uneval(event.params)}`, `server_route: ${stringified}`);
				}
			} else if (options.embedded) {
				hydrate.push(`params: ${devalue.uneval(event.params)}`, `route: ${s(event.route)}`);
			}

			const indent = '\t'.repeat(load_env_eagerly ? 7 : 6);
			args.push(`{\n${indent}\t${hydrate.join(`,\n${indent}\t`)}\n${indent}}`);
		}

		const remote_data = await collect_remote_data({}, event, state, options);

		const serialized_data =
			Object.keys(remote_data).length > 0
				? `${global}.data = ${uneval(remote_data)};\n\n\t\t\t\t\t\t`
				: '';

		// `client.app` is a proxy for `bundleStrategy === 'split'`
		const boot = client.inline
			? `${client.inline.script}

					${serialized_data}${global}.app.start(${args.join(', ')});`
			: client.app
				? `import(${s(prefixed(client.start))}).then(async (kit) => {
						kit.init(${global});
						const app = await import(${s(prefixed(client.app))});
						${serialized_data}kit.start(app, ${args.join(', ')});
					});`
				: `import(${s(prefixed(client.start))}).then((app) => {
						${serialized_data}app.start(${args.join(', ')})
					});`;

		if (load_env_eagerly) {
			blocks.push(`import(${s(`${base}/${paths.app_dir}/env.js`)}).then(({ env }) => {
						${global}.env = env;

						${boot.replace(/\n/g, '\n\t')}
					});`);
		} else {
			blocks.push(boot);
		}

		if (options.service_worker) {
			let opts = ", { type: 'module' }";
			if (options.service_worker_options != null) {
				const service_worker_options = { ...options.service_worker_options, type: 'module' };
				opts = `, ${s(service_worker_options)}`;
			}

			// we use an anonymous function instead of an arrow function to support
			// older browsers (https://github.com/sveltejs/kit/pull/5417)
			blocks.push(`if ('serviceWorker' in navigator) {
						const script_url = '${prefixed('service-worker.js')}';
						const policy = globalThis?.window?.trustedTypes?.createPolicy(
							'sveltekit-trusted-url',
							{ createScriptURL(url) { return url; } }
						);
						const sanitised = policy?.createScriptURL(script_url) ?? script_url;
						addEventListener('load', function () {
							navigator.serviceWorker.register(sanitised${opts});
						});
					}`);
		}

		const init_app = `
				{
					${blocks.join('\n\n\t\t\t\t\t')}
				}
			`;
		csp.add_script(init_app);

		body += `\n\t\t\t<script${
			csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ''
		}>${init_app}</script>\n\t\t`;
	}

	const headers = new Headers({
		'x-sveltekit-page': 'true',
		'content-type': 'text/html'
	});

	if (state.prerendering) {
		// TODO read headers set with setHeaders and convert into http-equiv where possible
		const csp_headers = csp.csp_provider.get_meta();
		if (csp_headers) {
			head.add_http_equiv(csp_headers);
		}

		if (state.prerendering.cache) {
			head.add_http_equiv(
				`<meta http-equiv="cache-control" content="${state.prerendering.cache}">`
			);
		}
	} else {
		const csp_header = csp.csp_provider.get_header();
		if (csp_header) {
			headers.set('content-security-policy', csp_header);
		}
		const report_only_header = csp.report_only_provider.get_header();
		if (report_only_header) {
			headers.set('content-security-policy-report-only', report_only_header);
		}

		if (options.link_header_preload && link_headers.size) {
			headers.set('link', Array.from(link_headers).join(', '));
		}
	}

	const html = options.templates.app({
		head: head.build(),
		body,
		assets,
		nonce: /** @type {string} */ (csp.nonce),
		env: env.explicit_public_env
	});

	// TODO flush chunks as early as we can
	const transformed =
		(await resolve_opts.transformPageChunk({
			html,
			done: true
		})) || '';

	if (!chunks) {
		headers.set('etag', `"${hash(transformed)}"`);
	}

	if (DEV) {
		if (page_config.csr) {
			if (count_non_ssi_comments(transformed) < count_non_ssi_comments(html)) {
				// the \u001B stuff is ANSI codes, so that we don't need to add a library to the runtime
				// https://svelte.dev/playground/1b3f49696f0c44c881c34587f2537aa2?version=4.2.19
				console.warn(
					"\u001B[1m\u001B[31mRemoving comments in transformPageChunk can break Svelte's hydration\u001B[39m\u001B[22m"
				);
			}
		} else {
			if (chunks) {
				console.warn(
					'\u001B[1m\u001B[31mReturning promises from server `load` functions will only work if `csr === true`\u001B[39m\u001B[22m'
				);
			}
		}
	}

	return !chunks
		? text(transformed, {
				status,
				headers
			})
		: new Response(
				new ReadableStream({
					async start(controller) {
						controller.enqueue(text_encoder.encode(transformed + '\n'));
						for await (const chunk of chunks) {
							if (chunk.length) controller.enqueue(text_encoder.encode(chunk));
						}
						controller.close();
					},

					type: 'bytes'
				}),
				{
					headers
				}
			);
}

class Head {
	#rendered;
	/** @type {string[]} */
	#http_equiv = [];
	/** @type {string[]} */
	#link_tags = [];
	/** @type {string[]} */
	#style_tags = [];
	/** @type {string[]} */
	#stylesheet_links = [];

	/**
	 * @param {string} rendered
	 */
	constructor(rendered) {
		this.#rendered = rendered;
	}

	build() {
		return [
			...this.#http_equiv,
			...this.#link_tags,
			this.#rendered,
			...this.#style_tags,
			...this.#stylesheet_links
		].join('\n\t\t');
	}

	/**
	 * @param {string} style
	 * @param {string[]} attributes
	 */
	add_style(style, attributes) {
		this.#style_tags.push(
			`<style${attributes.length ? ' ' + attributes.join(' ') : ''}>${style}</style>`
		);
	}

	/**
	 * @param {string} href
	 * @param {string[]} attributes
	 */
	add_stylesheet(href, attributes) {
		this.#stylesheet_links.push(`<link href="${href}" ${attributes.join(' ')}>`);
	}

	/**
	 * @param {string} href
	 * @param {string[]} attributes
	 */
	add_link_tag(href, attributes) {
		this.#link_tags.push(`<link href="${href}" ${attributes.join(' ')}>`);
	}

	/** @param {string} tag */
	add_http_equiv(tag) {
		this.#http_equiv.push(tag);
	}
}
