import * as devalue from 'devalue';
import { readable, writable } from 'svelte/store';
import { hash } from '../../hash.js';
import { serialize_data } from './serialize_data.js';
import { s } from '../../../utils/misc.js';
import { Csp } from './csp.js';

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

	const { entry } = options.manifest._;

	const stylesheets = new Set(entry.stylesheets);
	const modulepreloads = new Set(entry.imports);

	/** @type {Set<string>} */
	const link_header_preloads = new Set();

	/** @type {Map<string, string>} */
	// TODO if we add a client entry point one day, we will need to include inline_styles with the entry, otherwise stylesheets will be linked even if they are below inlineStyleThreshold
	const inline_styles = new Map();

	let rendered;

	const form_value =
		action_result?.type === 'success' || action_result?.type === 'invalid'
			? action_result.data ?? null
			: null;

	if (page_config.ssr) {
		/** @type {Record<string, any>} */
		const props = {
			stores: {
				page: writable(null),
				navigating: writable(null),
				updated
			},
			components: await Promise.all(branch.map(({ node }) => node.component())),
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
			routeId: event.routeId,
			status,
			url: event.url,
			data,
			form: form_value
		};

		// TODO remove this for 1.0
		/**
		 * @param {string} property
		 * @param {string} replacement
		 */
		const print_error = (property, replacement) => {
			Object.defineProperty(props.page, property, {
				get: () => {
					throw new Error(`$page.${property} has been replaced by $page.url.${replacement}`);
				}
			});
		};

		print_error('origin', 'origin');
		print_error('path', 'pathname');
		print_error('query', 'searchParams');

		rendered = options.root.render(props);

		for (const { node } of branch) {
			if (node.imports) {
				node.imports.forEach((url) => modulepreloads.add(url));
			}

			if (node.stylesheets) {
				node.stylesheets.forEach((url) => stylesheets.add(url));
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
		dev: options.dev,
		prerender: !!state.prerendering
	});

	const target = hash(body);

	/**
	 * The prefix to use for static assets. Replaces `%sveltekit.assets%` in the template
	 * @type {string}
	 */
	let assets;

	if (options.paths.assets) {
		// if an asset path is specified, use it
		assets = options.paths.assets;
	} else if (state.prerendering?.fallback) {
		// if we're creating a fallback page, asset paths need to be root-relative
		assets = options.paths.base;
	} else {
		// otherwise we want asset paths to be relative to the page, so that they
		// will work in odd contexts like IPFS, the internet archive, and so on
		const segments = event.url.pathname.slice(options.paths.base.length).split('/').slice(2);
		assets = segments.length > 0 ? segments.map(() => '..').join('/') : '.';
	}

	/** @param {string} path */
	const prefixed = (path) => (path.startsWith('/') ? path : `${assets}/${path}`);

	const serialized = { data: '', form: 'null' };

	try {
		serialized.data = devalue.uneval(branch.map(({ server_data }) => server_data));
	} catch (e) {
		// If we're here, the data could not be serialized with devalue
		// TODO if we wanted to get super fancy we could track down the origin of the `load`
		// function, but it would mean passing more stuff around than we currently do
		const error = /** @type {any} */ (e);
		const match = /\[(\d+)\]\.data\.(.+)/.exec(error.path);
		if (match) {
			throw new Error(
				`Data returned from \`load\` while rendering ${event.routeId} is not serializable: ${error.message} (data.${match[2]})`
			);
		}
		throw error;
	}

	if (form_value) {
		// no need to check it can be serialized, we already verified that it's JSON-friendly
		serialized.form = devalue.uneval(form_value);
	}

	if (inline_styles.size > 0) {
		const content = Array.from(inline_styles.values()).join('\n');

		const attributes = [];
		if (options.dev) attributes.push(' data-sveltekit');
		if (csp.style_needs_nonce) attributes.push(` nonce="${csp.nonce}"`);

		csp.add_style(content);

		head += `\n\t<style${attributes.join('')}>${content}</style>`;
	}

	for (const dep of stylesheets) {
		const path = prefixed(dep);
		const attributes = [];

		if (csp.style_needs_nonce) {
			attributes.push(`nonce="${csp.nonce}"`);
		}

		if (inline_styles.has(dep)) {
			// don't load stylesheets that are already inlined
			// include them in disabled state so that Vite can detect them and doesn't try to add them
			attributes.push('disabled', 'media="(max-width: 0)"');
		} else {
			const preload_atts = ['rel="preload"', 'as="style"'].concat(attributes);
			link_header_preloads.add(`<${encodeURI(path)}>; ${preload_atts.join(';')}; nopush`);
		}

		attributes.unshift('rel="stylesheet"');
		head += `\n\t\t<link href="${path}" ${attributes.join(' ')}>`;
	}

	if (page_config.csr) {
		// prettier-ignore
		const init_app = `
			import { start } from ${s(prefixed(entry.file))};

			start({
				env: ${s(options.public_env)},
				hydrate: ${page_config.ssr ? `{
					status: ${status},
					error: ${s(error)},
					node_ids: [${branch.map(({ node }) => node.index).join(', ')}],
					params: ${devalue.uneval(event.params)},
					routeId: ${s(event.routeId)},
					data: ${serialized.data},
					form: ${serialized.form}
				}` : 'null'},
				paths: ${s(options.paths)},
				target: document.querySelector('[data-sveltekit-hydrate="${target}"]').parentNode,
				trailing_slash: ${s(options.trailing_slash)}
			});
		`;

		for (const dep of modulepreloads) {
			const path = prefixed(dep);
			link_header_preloads.add(`<${encodeURI(path)}>; rel="modulepreload"; nopush`);
			if (state.prerendering) {
				head += `\n\t\t<link rel="modulepreload" href="${path}">`;
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
		// we use an anonymous function instead of an arrow function to support
		// older browsers (https://github.com/sveltejs/kit/pull/5417)
		const init_service_worker = `
			if ('serviceWorker' in navigator) {
				addEventListener('load', function () {
					navigator.serviceWorker.register('${prefixed('service-worker.js')}');
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

	// TODO flush chunks as early as we can
	const html =
		(await resolve_opts.transformPageChunk({
			html: options.app_template({ head, body, assets, nonce: /** @type {string} */ (csp.nonce) }),
			done: true
		})) || '';

	const headers = new Headers({
		'x-sveltekit-page': 'true',
		'content-type': 'text/html',
		etag: `"${hash(html)}"`
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

	return new Response(html, {
		status,
		headers
	});
}
