import * as devalue from 'devalue';
import { readable, writable } from 'svelte/store';
import { DEV } from 'esm-env';
import { assets, base } from '__sveltekit/paths';
import { hash } from '../../hash.js';
import { serialize_data } from './serialize_data.js';
import { s } from '../../../utils/misc.js';
import { Csp } from './csp.js';
import { uneval_action_response } from './actions.js';
import { clarify_devalue_error, stringify_uses, handle_error_and_jsonify } from '../utils.js';
import { public_env } from '../../shared-server.js';
import { text } from '../../../exports/index.js';
import { create_async_iterator } from '../../../utils/streaming.js';

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
			}
		} else {
			rendered = options.root.render(props);
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

	/**
	 * The prefix to use for static assets. Replaces `%sveltekit.assets%` in the template
	 * @type {string}
	 */
	let resolved_assets;

	/**
	 * @type {string}
	 * An expression that will evaluate in the client to determine the resolved asset path
	 */
	let asset_expression;

	if (assets) {
		// if an asset path is specified, use it
		resolved_assets = assets;
		asset_expression = s(assets);
	} else if (state.prerendering?.fallback) {
		// if we're creating a fallback page, asset paths need to be root-relative
		resolved_assets = base;
		asset_expression = s(base);
	} else {
		// otherwise we want asset paths to be relative to the page, so that they
		// will work in odd contexts like IPFS, the internet archive, and so on
		const segments = event.url.pathname.slice(base.length).split('/').slice(2);
		resolved_assets = segments.length > 0 ? segments.map(() => '..').join('/') : '.';
		asset_expression = `new URL(${s(
			resolved_assets
		)}, location.href).pathname.replace(/^\\\/$/, '')`;
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
			return base + path;
		}
		return `${resolved_assets}/${path}`;
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

		if (resolve_opts.preload({ type: 'css', path })) {
			const attributes = ['rel="stylesheet"'];

			if (inline_styles.has(dep)) {
				// don't load stylesheets that are already inlined
				// include them in disabled state so that Vite can detect them and doesn't try to add them
				attributes.push('disabled', 'media="(max-width: 0)"');
			} else {
				const preload_atts = ['rel="preload"', 'as="style"'];
				link_header_preloads.add(`<${encodeURI(path)}>; ${preload_atts.join(';')}; nopush`);
			}

			head += `\n\t\t<link href="${path}" ${attributes.join(' ')}>`;
		}
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
		const detectModernBrowserVarName = '__KIT_is_modern_browser';

		/** A startup script var name for the init function, used when the user wants legacy support. */
		const startup_script_var_name = '__KIT_startup_script';

		const init_script_id = '__KIT_legacy_init_id';

		const modern_import_func_var_name = '__KIT_modern_import_func';

		/**
		 * Generate JS init code for the HTML entry page
		 * @param {boolean} legacy_support_and_export_init
		 * @returns {string}
		 */
		const generate_init_script = (legacy_support_and_export_init) => {
			/** @type {string[]} */
			const blocks = [];

			/** @type {Record<string, string>} */
			const init_input = {};

			const import_func = legacy_support_and_export_init ? 'import_func' : 'import';
			if (legacy_support_and_export_init) {
				init_input.import_func = `window.${modern_import_func_var_name} || (function (id) { return System.import(id); })`;
			}

			const properties = [
				`env: ${s(public_env)}`,
				`assets: ${asset_expression}`,
				`element: ${
					legacy_support_and_export_init
						? `document.getElementById(${s(init_script_id)})`
						: 'document.currentScript'
				}.parentNode`
			];

			if (chunks) {
				// TODO: Fix this code to be legacy compatible
				init_input['deferred'] = 'new Map()';

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

			const global_kit_prop_init = `${global} = {
						${properties.join(',\n\t\t\t\t\t\t')}
					};`;

			const args = [`app`, `${global}.element`];

			if (page_config.ssr) {
				const serialized = { form: 'null', error: 'null' };

				init_input['data'] = data;

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
					`data: data`,
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

			/**
			 *
			 * @param {import('types').AssetDependenciesWithLegacy[]} assets
			 * @param {(asset: import('types').AssetDependenciesWithLegacy) => string} getPathFunc
			 * @returns {string}
			 */
			const get_import_arr = (assets, getPathFunc) =>
				`[\n\t\t\t\t\t\t${assets
					.map((asset) => `${import_func}(${s(prefixed(getPathFunc(asset)))})`)
					.join(',\n\t\t\t\t\t\t')}\n\t\t\t\t\t]`;

			const assets = [client.start, client.app];
			const modern_import_arr = get_import_arr(assets, (asset) => asset.file);
			const get_legacy_import_arr = () =>
				get_import_arr(assets, (asset) => /** @type {string} */ (asset.legacy_file));

			const import_arr_combined = legacy_support_and_export_init
				? `window.${detectModernBrowserVarName} ? ${modern_import_arr} : ${get_legacy_import_arr()}`
				: modern_import_arr;

			blocks.push(
				legacy_support_and_export_init
					? `Promise.all(${import_arr_combined}).then(function (modules) {
						(function (kit, app) { kit.start(${args.join(', ')}) })(modules[0], modules[1]);
					});`
					: `Promise.all(${import_arr_combined}).then(([kit, app]) => {
						kit.start(${args.join(', ')});
					});`
			);

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

			const init_input_list = Object.entries(init_input);

			return legacy_support_and_export_init
				? `
				window.${startup_script_var_name} = function () {
					${global_kit_prop_init}
					(function (${init_input_list.map(([key]) => key).join(', ')}) {
					${blocks.join('\n\n\t\t\t\t\t')}
				})(${init_input_list.map(([, value]) => value).join(', ')}); };
			`
				: `
				{
					${global_kit_prop_init}
					${[...init_input_list.map(([key, val]) => `const ${key} = ${val};`), '', ...blocks].join(
						'\n\n\t\t\t\t\t'
					)}
				}
			`;
		};

		// Injecting (potentially) legacy script together with the modern script -
		//  in a similar fashion to the script tags injection of @vitejs/plugin-legacy.
		// Notice that unlike the script injection on @vitejs/plugin-legacy,
		//  we don't need to have a constant CSP since kit handles it.

		if (client.modern_polyfills_file) {
			const path = prefixed(client.modern_polyfills_file);
			link_header_preloads.add(
				`<${encodeURI(path)}>; rel="modulepreload"; crossorigin="anonymous"; nopush`
			);
			head += `\n\t\t<script type="module" crossorigin="anonymous" src=${s(path)}></script>`;
		}

		const included_modulepreloads = Array.from(modulepreloads, (dep) => prefixed(dep)).filter(
			(path) => resolve_opts.preload({ type: 'js', path })
		);

		for (const path of included_modulepreloads) {
			// we use modulepreload with the Link header for Chrome, along with
			// <link rel="preload"> for Safari. This results in the fastest loading in
			// the most used browsers, with no double-loading. Note that we need to use
			// .mjs extensions for `preload` to behave like `modulepreload` in Chrome
			link_header_preloads.add(`<${encodeURI(path)}>; rel="modulepreload"; nopush`);
			head += `\n\t\t<link rel="preload" as="script" crossorigin="anonymous" href="${path}">`;
		}

		/**
		 *
		 * @param {string} script
		 * @param {string | undefined} additionalAttrs
		 */
		function add_traditional_script(script, additionalAttrs = undefined) {
			body +=
				`\n\t\t\t<script` +
				(additionalAttrs ? ` ${additionalAttrs}` : '') +
				(script && csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : '') +
				`>${script}</script>`;

			if (script) {
				csp.add_script(script);
			}
		}

		/**
		 *
		 * @param {string} script
		 * @param {string | undefined} additionalAttrs
		 */
		const add_nomodule_script_unsafe = (script, additionalAttrs = undefined) =>
			add_traditional_script(script, `nomodule${additionalAttrs ? ` ${additionalAttrs}` : ''}`);

		let had_emitted_nomodule_fix = false;
		function emit_nomodule_fix_if_needed() {
			if (had_emitted_nomodule_fix) {
				return;
			}
			// otherwise

			had_emitted_nomodule_fix = true;

			// Before adding nomodule scripts, we need to inject Safari 10 nomodule fix
			// https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc
			// DO NOT ALTER THIS CONTENT
			const safari10NoModuleFix = `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`;
			add_nomodule_script_unsafe(safari10NoModuleFix);
		}

		/**
		 *
		 * @param {string} script
		 * @param {string | undefined} additionalAttrs
		 */
		function add_nomodule_script(script, additionalAttrs = undefined) {
			emit_nomodule_fix_if_needed();
			add_nomodule_script_unsafe(script, additionalAttrs);
		}

		if (client.legacy_polyfills_file) {
			add_nomodule_script('', `src=${s(prefixed(client.legacy_polyfills_file))}`);
		}

		if (client.start.legacy_file && client.app.legacy_file) {
			// Have legacy support

			const detectModernBrowserCode = `try{import.meta.url;import("_").catch(()=>1);}catch(e){}window.${detectModernBrowserVarName}=true;window.${modern_import_func_var_name}=(path)=>import(path);`;
			head += `\n\t\t<script type="module"${
				csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ''
			}>${detectModernBrowserCode}</script>`;
			csp.add_script(detectModernBrowserCode);

			emit_nomodule_fix_if_needed();

			add_traditional_script(generate_init_script(true), `id=${s(init_script_id)}`);

			add_nomodule_script(`window.${startup_script_var_name}();`);

			const dynamicInitOrFallbackInlineCode =
				`!function(){if(window.${detectModernBrowserVarName}){window.${startup_script_var_name}();}else{console.warn("kit: loading legacy build because dynamic import or import.meta.url is unsupported, syntax error above should be ignored");` +
				(client.legacy_polyfills_file
					? `var n=document.createElement("script");n.src=${s(
							prefixed(client.legacy_polyfills_file)
					  )},n.onload=window.${startup_script_var_name},document.body.appendChild(n)`
					: `window.${startup_script_var_name}()`) +
				`}}();`;
			body += `\n\t\t\t<script type="module"${
				csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ''
			}>${dynamicInitOrFallbackInlineCode}</script>`;
			csp.add_script(dynamicInitOrFallbackInlineCode);
		} else {
			// No legacy support

			add_traditional_script(generate_init_script(false));
		}

		body += '\n\t\t';
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
		assets: resolved_assets,
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
