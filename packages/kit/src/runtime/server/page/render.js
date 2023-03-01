import * as devalue from 'devalue';
import { readable, writable } from 'svelte/store';
import { DEV } from 'esm-env';
import * as paths from '__sveltekit/paths';
import { hash } from '../../hash.js';
import { serialize_data } from './serialize_data.js';
import { s } from '../../../utils/misc.js';
import { Csp } from './csp.js';
import { uneval_action_response } from './actions.js';
import { clarify_devalue_error, stringify_uses, handle_error_and_jsonify } from '../utils.js';
import { public_env } from '../../shared-server.js';
import { text } from '../../../exports/index.js';
import { create_async_iterator } from '../../../utils/streaming.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';

// TODO rename this function/module

const updated = {
	...readable(false),
	check: () => false
};

const encoder = new TextEncoder();

/**
 * Creates the HTML response.
 * @param {{
 *   branch: Array<import('./types').Loaded>;
 *   fetched: Array<import('./types').Fetched>;
 *   options: import('types').SSROptions;
 *   manifest: import('types').SSRManifest;
 *   state: import('types').SSRState;
 *   page_config: { ssr: boolean; csr: boolean };
 *   status: number;
 *   error: App.Error | null;
 *   event: import('types').RequestEvent;
 *   resolve_opts: import('types').RequiredResolveOptions;
 *   action_result?: import('types').ActionResult;
 * }} opts
 */
export async function render_response({
	branch,
	fetched,
	options,
	manifest,
	state,
	page_config,
	status,
	error = null,
	event,
	resolve_opts,
	action_result
}) {
	if (state.prerendering) {
		if (options.csp.mode === 'nonce') {
			throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
		}

		if (options.app_template_contains_nonce) {
			throw new Error('Cannot use prerendering if page template contains %sveltekit.nonce%');
		}
	}

	const { client } = manifest._;

	const modulepreloads = new Set([...client.start.imports, ...client.app.imports]);
	const stylesheets = new Set(client.app.stylesheets);
	const fonts = new Set(client.app.fonts);

	/** @type {Set<string>} */
	const link_header_preloads = new Set();

	/** @type {Map<string, string>} */
	// TODO if we add a client entry point one day, we will need to include inline_styles with the entry, otherwise stylesheets will be linked even if they are below inlineStyleThreshold
	const inline_styles = new Map();

	let rendered;

	const form_value =
		action_result?.type === 'success' || action_result?.type === 'failure'
			? action_result.data ?? null
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

	// if appropriate, use relative paths for greater portability
	if (paths.relative !== false && !state.prerendering?.fallback) {
		const segments = event.url.pathname.slice(paths.base.length).split('/');

		if (segments.length === 1 && paths.base !== '') {
			// if we're on `/my-base-path`, relative links need to start `./my-base-path` rather than `.`
			base = `./${paths.base.split('/').at(-1)}`;

			base_expression = `new URL(${s(base)}, location).pathname`;
		} else {
			base =
				segments
					.slice(2)
					.map(() => '..')
					.join('/') || '.';

			// resolve e.g. '../..' against current location, then remove trailing slash
			base_expression = `new URL(${s(base)}, location).pathname.slice(0, -1)`;
		}

		if (!paths.assets || (paths.assets[0] === '/' && paths.assets !== SVELTE_KIT_ASSETS)) {
			assets = base;
		}
	}

	if (page_config.ssr) {
		if (__SVELTEKIT_DEV__ && !branch.at(-1)?.node.component) {
			// Can only be the leaf, layouts have a fallback component generated
			throw new Error(`Missing +page.svelte component for route ${event.route.id}`);
		}

		/** @type {Record<string, any>} */
		const props = {
			stores: {
				page: writable(null),
				navigating: writable(null),
				updated
			},
			constructors: await Promise.all(branch.map(({ node }) => node.component())),
			form: form_value
		};

		let data = {};

		// props_n (instead of props[n]) makes it easy to avoid
		// unnecessary updates for layout components
		for (let i = 0; i < branch.length; i += 1) {
			data = { ...data, ...branch[i].data };
			props[`data_${i}`] = data;
		}

		props.page = {
			error,
			params: /** @type {Record<string, any>} */ (event.params),
			route: event.route,
			status,
			url: event.url,
			data,
			form: form_value
		};

		// use relative paths during rendering, so that the resulting HTML is as
		// portable as possible, but reset afterwards
		if (paths.relative) paths.override({ base, assets });

		if (__SVELTEKIT_DEV__) {
			const fetch = globalThis.fetch;
			let warned = false;
			globalThis.fetch = (info, init) => {
				if (typeof info === 'string' && !/^\w+:\/\//.test(info)) {
					throw new Error(
						`Cannot call \`fetch\` eagerly during server side rendering with relative URL (${info}) — put your \`fetch\` calls inside \`onMount\` or a \`load\` function instead`
					);
				} else if (!warned) {
					console.warn(
						`Avoid calling \`fetch\` eagerly during server side rendering — put your \`fetch\` calls inside \`onMount\` or a \`load\` function instead`
					);
					warned = true;
				}

				return fetch(info, init);
			};

			try {
				rendered = options.root.render(props);
			} finally {
				globalThis.fetch = fetch;
				paths.reset();
			}
		} else {
			try {
				rendered = options.root.render(props);
			} finally {
				paths.reset();
			}
		}

		for (const { node } of branch) {
			for (const url of node.imports) modulepreloads.add(url);
			for (const url of node.stylesheets) stylesheets.add(url);
			for (const url of node.fonts) fonts.add(url);

			if (node.inline_styles) {
				Object.entries(await node.inline_styles()).forEach(([k, v]) => inline_styles.set(k, v));
			}
		}
	} else {
		rendered = { head: '', html: '', css: { code: '', map: null } };
	}

	let head = '';
	let body = rendered.html;

	const csp = new Csp(options.csp, {
		prerender: !!state.prerendering
	});

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

	if (inline_styles.size > 0) {
		const content = Array.from(inline_styles.values()).join('\n');

		const attributes = __SVELTEKIT_DEV__ ? [' data-sveltekit'] : [];
		if (csp.style_needs_nonce) attributes.push(` nonce="${csp.nonce}"`);

		csp.add_style(content);

		head += `\n\t<style${attributes.join('')}>${content}</style>`;
	}

	for (const dep of stylesheets) {
		const path = prefixed(dep);

		const attributes = ['rel="stylesheet"'];

		if (inline_styles.has(dep)) {
			// don't load stylesheets that are already inlined
			// include them in disabled state so that Vite can detect them and doesn't try to add them
			attributes.push('disabled', 'media="(max-width: 0)"');
		} else {
			if (resolve_opts.preload({ type: 'css', path })) {
				const preload_atts = ['rel="preload"', 'as="style"'];
				link_header_preloads.add(`<${encodeURI(path)}>; ${preload_atts.join(';')}; nopush`);
			}
		}

		head += `\n\t\t<link href="${path}" ${attributes.join(' ')}>`;
	}

	for (const dep of fonts) {
		const path = prefixed(dep);

		if (resolve_opts.preload({ type: 'font', path })) {
			const ext = dep.slice(dep.lastIndexOf('.') + 1);
			const attributes = [
				'rel="preload"',
				'as="font"',
				`type="font/${ext}"`,
				`href="${path}"`,
				'crossorigin'
			];

			head += `\n\t\t<link ${attributes.join(' ')}>`;
		}
	}

	const global = `__sveltekit_${options.version_hash}`;

	const { data, chunks } = get_data(
		event,
		options,
		branch.map((b) => b.server_data),
		global
	);

	if (page_config.ssr && page_config.csr) {
		body += `\n\t\t\t${fetched
			.map((item) =>
				serialize_data(item, resolve_opts.filterSerializedResponseHeaders, !!state.prerendering)
			)
			.join('\n\t\t\t')}`;
	}

	if (page_config.csr) {
		const included_modulepreloads = Array.from(modulepreloads, (dep) => prefixed(dep)).filter(
			(path) => resolve_opts.preload({ type: 'js', path })
		);

		for (const path of included_modulepreloads) {
			// see the kit.output.preloadStrategy option for details on why we have multiple options here
			link_header_preloads.add(`<${encodeURI(path)}>; rel="modulepreload"; nopush`);
			if (options.preload_strategy !== 'modulepreload') {
				head += `\n\t\t<link rel="preload" as="script" crossorigin="anonymous" href="${path}">`;
			} else if (state.prerendering) {
				head += `\n\t\t<link rel="modulepreload" href="${path}">`;
			}
		}

		const blocks = [];

		const properties = [
			`env: ${s(public_env)}`,
			paths.assets && `assets: ${s(paths.assets)}`,
			`base: ${base_expression}`,
			`element: document.currentScript.parentElement`
		].filter(Boolean);

		if (chunks) {
			blocks.push(`const deferred = new Map();`);

			properties.push(`defer: (id) => new Promise((fulfil, reject) => {
							deferred.set(id, { fulfil, reject });
						})`);

			properties.push(`resolve: ({ id, data, error }) => {
							const { fulfil, reject } = deferred.get(id);
							deferred.delete(id);

							if (error) reject(error);
							else fulfil(data);
						}`);
		}

		blocks.push(`${global} = {
						${properties.join(',\n\t\t\t\t\t\t')}
					};`);

		const args = [`app`, `${global}.element`];

		if (page_config.ssr) {
			const serialized = { form: 'null', error: 'null' };

			blocks.push(`const data = ${data};`);

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
				`data`,
				`form: ${serialized.form}`,
				`error: ${serialized.error}`
			];

			if (status !== 200) {
				hydrate.push(`status: ${status}`);
			}

			if (options.embedded) {
				hydrate.push(`params: ${devalue.uneval(event.params)}`, `route: ${s(event.route)}`);
			}

			args.push(`{\n\t\t\t\t\t\t\t${hydrate.join(',\n\t\t\t\t\t\t\t')}\n\t\t\t\t\t\t}`);
		}

		blocks.push(`Promise.all([
						import(${s(prefixed(client.start.file))}),
						import(${s(prefixed(client.app.file))})
					]).then(([kit, app]) => {
						kit.start(${args.join(', ')});
					});`);

		if (options.service_worker) {
			const opts = __SVELTEKIT_DEV__ ? `, { type: 'module' }` : '';

			// we use an anonymous function instead of an arrow function to support
			// older browsers (https://github.com/sveltejs/kit/pull/5417)
			blocks.push(`if ('serviceWorker' in navigator) {
						addEventListener('load', function () {
							navigator.serviceWorker.register('${prefixed('service-worker.js')}'${opts});
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
		const http_equiv = [];

		const csp_headers = csp.csp_provider.get_meta();
		if (csp_headers) {
			http_equiv.push(csp_headers);
		}

		if (state.prerendering.cache) {
			http_equiv.push(`<meta http-equiv="cache-control" content="${state.prerendering.cache}">`);
		}

		if (http_equiv.length > 0) {
			head = http_equiv.join('\n') + head;
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

		if (link_header_preloads.size) {
			headers.set('link', Array.from(link_header_preloads).join(', '));
		}
	}

	// add the content after the script/css links so the link elements are parsed first
	head += rendered.head;

	const html = options.templates.app({
		head,
		body,
		assets,
		nonce: /** @type {string} */ (csp.nonce),
		env: public_env
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
			if (transformed.split('<!--').length < html.split('<!--').length) {
				// the \u001B stuff is ANSI codes, so that we don't need to add a library to the runtime
				// https://svelte.dev/repl/1b3f49696f0c44c881c34587f2537aa2
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
						controller.enqueue(encoder.encode(transformed + '\n'));
						for await (const chunk of chunks) {
							controller.enqueue(encoder.encode(chunk));
						}
						controller.close();
					},

					type: 'bytes'
				}),
				{
					headers: {
						'content-type': 'text/html'
					}
				}
		  );
}

/**
 * If the serialized data contains promises, `chunks` will be an
 * async iterable containing their resolutions
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {Array<import('types').ServerDataNode | null>} nodes
 * @param {string} global
 * @returns {{ data: string, chunks: AsyncIterable<string> | null }}
 */
function get_data(event, options, nodes, global) {
	let promise_id = 1;
	let count = 0;

	const { iterator, push, done } = create_async_iterator();

	/** @param {any} thing */
	function replacer(thing) {
		if (typeof thing?.then === 'function') {
			const id = promise_id++;
			count += 1;

			thing
				.then(/** @param {any} data */ (data) => ({ data }))
				.catch(
					/** @param {any} error */ async (error) => ({
						error: await handle_error_and_jsonify(event, options, error)
					})
				)
				.then(
					/**
					 * @param {{data: any; error: any}} result
					 */
					async ({ data, error }) => {
						count -= 1;

						let str;
						try {
							str = devalue.uneval({ id, data, error }, replacer);
						} catch (e) {
							error = await handle_error_and_jsonify(
								event,
								options,
								new Error(`Failed to serialize promise while rendering ${event.route.id}`)
							);
							data = undefined;
							str = devalue.uneval({ id, data, error }, replacer);
						}

						push(`<script>${global}.resolve(${str})</script>\n`);
						if (count === 0) done();
					}
				);

			return `${global}.defer(${id})`;
		}
	}

	try {
		const strings = nodes.map((node) => {
			if (!node) return 'null';

			return `{"type":"data","data":${devalue.uneval(node.data, replacer)},${stringify_uses(node)}${
				node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ''
			}}`;
		});

		return {
			data: `[${strings.join(',')}]`,
			chunks: count > 0 ? iterator : null
		};
	} catch (e) {
		throw new Error(clarify_devalue_error(event, /** @type {any} */ (e)));
	}
}
