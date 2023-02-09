import * as devalue from 'devalue';
import { readable, writable } from 'svelte/store';
import { DEV } from 'esm-env';
import { assets, base } from '$internal/paths';
import { hash } from '../../hash.js';
import { serialize_data } from './serialize_data.js';
import { s } from '../../../utils/misc.js';
import { Csp } from './csp.js';
import { uneval_action_response } from './actions.js';
import { clarify_devalue_error } from '../utils.js';
import { version, public_env } from '../../shared.js';
import { text } from '../../../exports/index.js';

// TODO rename this function/module

const updated = {
	...readable(false),
	check: () => false
};

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

	const { entry } = manifest._;

	const stylesheets = new Set(entry.stylesheets);
	const modulepreloads = new Set(entry.imports);
	const fonts = new Set(manifest._.entry.fonts);

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

		rendered = options.root.render(props);

		for (const { node } of branch) {
			if (node.imports) {
				node.imports.forEach((url) => modulepreloads.add(url));
			}

			if (node.stylesheets) {
				node.stylesheets.forEach((url) => stylesheets.add(url));
			}

			if (node.fonts) {
				node.fonts.forEach((url) => fonts.add(url));
			}

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

	const target = hash(body);

	/**
	 * The prefix to use for static assets. Replaces `%sveltekit.assets%` in the template
	 * @type {string}
	 */
	let resolved_assets;

	if (assets) {
		// if an asset path is specified, use it
		resolved_assets = assets;
	} else if (state.prerendering?.fallback) {
		// if we're creating a fallback page, asset paths need to be root-relative
		resolved_assets = base;
	} else {
		// otherwise we want asset paths to be relative to the page, so that they
		// will work in odd contexts like IPFS, the internet archive, and so on
		const segments = event.url.pathname.slice(base.length).split('/').slice(2);
		resolved_assets = segments.length > 0 ? segments.map(() => '..').join('/') : '.';
	}

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

	const serialized = { data: '', form: 'null', error: 'null' };

	try {
		serialized.data = `[${branch
			.map(({ server_data }) => {
				if (server_data?.type === 'data') {
					const data = devalue.uneval(server_data.data);

					const uses = [];
					if (server_data.uses.dependencies.size > 0) {
						uses.push(`dependencies:${s(Array.from(server_data.uses.dependencies))}`);
					}

					if (server_data.uses.params.size > 0) {
						uses.push(`params:${s(Array.from(server_data.uses.params))}`);
					}

					if (server_data.uses.parent) uses.push(`parent:1`);
					if (server_data.uses.route) uses.push(`route:1`);
					if (server_data.uses.url) uses.push(`url:1`);

					return `{type:"data",data:${data},uses:{${uses.join(',')}}${
						server_data.slash ? `,slash:${s(server_data.slash)}` : ''
					}}`;
				}

				return s(server_data);
			})
			.join(',')}]`;
	} catch (e) {
		const error = /** @type {any} */ (e);
		throw new Error(clarify_devalue_error(event, error));
	}

	if (form_value) {
		serialized.form = uneval_action_response(form_value, /** @type {string} */ (event.route.id));
	}

	if (error) {
		serialized.error = devalue.uneval(error);
	}

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

	if (page_config.csr) {
		const opts = [
			`assets: ${s(assets)}`,
			`env: ${s(public_env)}`,
			`target: document.querySelector('[data-sveltekit-hydrate="${target}"]').parentNode`,
			`version: ${s(version)}`
		];

		if (page_config.ssr) {
			const hydrate = [
				`node_ids: [${branch.map(({ node }) => node.index).join(', ')}]`,
				`data: ${serialized.data}`,
				`form: ${serialized.form}`,
				`error: ${serialized.error}`
			];

			if (status !== 200) {
				hydrate.push(`status: ${status}`);
			}

			if (options.embedded) {
				hydrate.push(`params: ${devalue.uneval(event.params)}`, `route: ${s(event.route)}`);
			}

			opts.push(`hydrate: {\n\t\t\t\t\t${hydrate.join(',\n\t\t\t\t\t')}\n\t\t\t\t}`);
		}

		// prettier-ignore
		const init_app = `
			import { start } from ${s(prefixed(entry.file))};

			start({
				${opts.join(',\n\t\t\t\t')}
			});
		`;

		for (const dep of modulepreloads) {
			const path = prefixed(dep);

			if (resolve_opts.preload({ type: 'js', path })) {
				link_header_preloads.add(`<${encodeURI(path)}>; rel="modulepreload"; nopush`);
				if (state.prerendering) {
					head += `\n\t\t<link rel="modulepreload" href="${path}">`;
				}
			}
		}

		const attributes = ['type="module"', `data-sveltekit-hydrate="${target}"`];

		csp.add_script(init_app);

		if (csp.script_needs_nonce) {
			attributes.push(`nonce="${csp.nonce}"`);
		}

		body += `\n\t\t<script ${attributes.join(' ')}>${init_app}</script>`;
	}

	if (page_config.ssr && page_config.csr) {
		body += `\n\t${fetched
			.map((item) =>
				serialize_data(item, resolve_opts.filterSerializedResponseHeaders, !!state.prerendering)
			)
			.join('\n\t')}`;
	}

	if (options.service_worker) {
		const opts = __SVELTEKIT_DEV__ ? `, { type: 'module' }` : '';

		// we use an anonymous function instead of an arrow function to support
		// older browsers (https://github.com/sveltejs/kit/pull/5417)
		const init_service_worker = `
			if ('serviceWorker' in navigator) {
				addEventListener('load', function () {
					navigator.serviceWorker.register('${prefixed('service-worker.js')}'${opts});
				});
			}
		`;

		// always include service worker unless it's turned off explicitly
		csp.add_script(init_service_worker);

		head += `
		<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ''}>${init_service_worker}</script>`;
	}

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

	if (DEV && page_config.csr) {
		if (transformed.split('<!--').length < html.split('<!--').length) {
			// the \u001B stuff is ANSI codes, so that we don't need to add a library to the runtime
			// https://svelte.dev/repl/1b3f49696f0c44c881c34587f2537aa2
			console.warn(
				"\u001B[1m\u001B[31mRemoving comments in transformPageChunk can break Svelte's hydration\u001B[39m\u001B[22m"
			);
		}
	}

	const headers = new Headers({
		'x-sveltekit-page': 'true',
		'content-type': 'text/html',
		etag: `"${hash(transformed)}"`
	});

	if (!state.prerendering) {
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

	return text(transformed, {
		status,
		headers
	});
}
