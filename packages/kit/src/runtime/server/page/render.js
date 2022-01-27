import devalue from 'devalue';
import { writable } from 'svelte/store';
import { coalesce_to_error } from '../../../utils/error.js';
import { hash } from '../../hash.js';
import { escape_html_attr } from '../../../utils/escape.js';
import { s } from '../../../utils/misc.js';
import { create_prerendering_url_proxy } from './utils.js';
import { Csp, csp_ready } from './csp.js';

// TODO rename this function/module

/**
 * @param {{
 *   branch: Array<import('./types').Loaded>;
 *   options: import('types/internal').SSRRenderOptions;
 *   state: import('types/internal').SSRRenderState;
 *   $session: any;
 *   page_config: { hydrate: boolean, router: boolean };
 *   status: number;
 *   error?: Error;
 *   url: URL;
 *   params: Record<string, string>;
 *   ssr: boolean;
 *   stuff: Record<string, any>;
 * }} opts
 */
export async function render_response({
	branch,
	options,
	state,
	$session,
	page_config,
	status,
	error,
	url,
	params,
	ssr,
	stuff
}) {
	if (state.prerender) {
		if (options.csp.mode === 'nonce') {
			throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
		}

		if (options.template_contains_nonce) {
			throw new Error('Cannot use prerendering if page template contains %svelte.nonce%');
		}
	}

	const stylesheets = new Set(options.manifest._.entry.css);
	const modulepreloads = new Set(options.manifest._.entry.js);
	/** @type {Map<string, string>} */
	const styles = new Map();

	/** @type {Array<{ url: string, body: string, json: string }>} */
	const serialized_data = [];

	let rendered;

	let is_private = false;
	let maxage;

	if (error) {
		error.stack = options.get_stack(error);
	}

	if (ssr) {
		branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
			if (node.css) node.css.forEach((url) => stylesheets.add(url));
			if (node.js) node.js.forEach((url) => modulepreloads.add(url));
			if (node.styles) Object.entries(node.styles).forEach(([k, v]) => styles.set(k, v));

			// TODO probably better if `fetched` wasn't populated unless `hydrate`
			if (fetched && page_config.hydrate) serialized_data.push(...fetched);

			if (uses_credentials) is_private = true;

			maxage = loaded.maxage;
		});

		const session = writable($session);

		/** @type {Record<string, any>} */
		const props = {
			stores: {
				page: writable(null),
				navigating: writable(null),
				session
			},
			page: {
				url: state.prerender ? create_prerendering_url_proxy(url) : url,
				params,
				status,
				error,
				stuff
			},
			components: branch.map(({ node }) => node.module.default)
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

		// props_n (instead of props[n]) makes it easy to avoid
		// unnecessary updates for layout components
		for (let i = 0; i < branch.length; i += 1) {
			props[`props_${i}`] = await branch[i].loaded.props;
		}

		let session_tracking_active = false;
		const unsubscribe = session.subscribe(() => {
			if (session_tracking_active) is_private = true;
		});
		session_tracking_active = true;

		try {
			rendered = options.root.render(props);
		} finally {
			unsubscribe();
		}
	} else {
		rendered = { head: '', html: '', css: { code: '', map: null } };
	}

	let { head, html: body } = rendered;

	const inlined_style = Array.from(styles.values()).join('\n');

	await csp_ready;
	const csp = new Csp(options.csp, {
		dev: options.dev,
		prerender: !!state.prerender,
		needs_nonce: options.template_contains_nonce
	});

	// prettier-ignore
	const init_app = `
		import { start } from ${s(options.prefix + options.manifest._.entry.file)};
		start({
			target: ${options.target ? `document.querySelector(${s(options.target)})` : 'document.body'},
			paths: ${s(options.paths)},
			session: ${try_serialize($session, (error) => {
				throw new Error(`Failed to serialize session data: ${error.message}`);
			})},
			route: ${!!page_config.router},
			spa: ${!ssr},
			trailing_slash: ${s(options.trailing_slash)},
			hydrate: ${ssr && page_config.hydrate ? `{
				status: ${status},
				error: ${serialize_error(error)},
				nodes: [
					${(branch || [])
					.map(({ node }) => `import(${s(options.prefix + node.entry)})`)
					.join(',\n\t\t\t\t\t\t')}
				],
				url: new URL(${s(url.href)}),
				params: ${devalue(params)}
			}` : 'null'}
		});
	`;

	const init_service_worker = `
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('${options.service_worker}');
		}
	`;

	if (options.amp) {
		head += `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"></script>

		<style amp-custom>${inlined_style}\n${rendered.css.code}</style>`;

		if (options.service_worker) {
			head +=
				'<script async custom-element="amp-install-serviceworker" src="https://cdn.ampproject.org/v0/amp-install-serviceworker-0.1.js"></script>';

			body += `<amp-install-serviceworker src="${options.service_worker}" layout="nodisplay"></amp-install-serviceworker>`;
		}
	} else {
		if (inlined_style) {
			const attributes = [];
			if (options.dev) attributes.push(' data-svelte');
			if (csp.style_needs_nonce) attributes.push(` nonce="${csp.nonce}"`);

			csp.add_style(inlined_style);

			head += `\n\t<style${attributes.join('')}>${inlined_style}</style>`;
		}

		// prettier-ignore
		head += Array.from(stylesheets)
			.map((dep) => {
				const attributes = [
					'rel="stylesheet"',
					`href="${options.prefix + dep}"`
				];

				if (csp.style_needs_nonce) {
					attributes.push(`nonce="${csp.nonce}"`);
				}

				if (styles.has(dep)) {
					attributes.push('disabled', 'media="(max-width: 0)"');
				}

				return `\n\t<link ${attributes.join(' ')}>`;
			})
			.join('');

		if (page_config.router || page_config.hydrate) {
			head += Array.from(modulepreloads)
				.map((dep) => `\n\t<link rel="modulepreload" href="${options.prefix + dep}">`)
				.join('');

			const attributes = ['type="module"'];

			csp.add_script(init_app);

			if (csp.script_needs_nonce) {
				attributes.push(`nonce="${csp.nonce}"`);
			}

			head += `<script ${attributes.join(' ')}>${init_app}</script>`;

			// prettier-ignore
			body += serialized_data
				.map(({ url, body, json }) => {
					let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
					if (body) attributes += ` data-body="${hash(body)}"`;

					return `<script ${attributes}>${json}</script>`;
				})
				.join('\n\n\t');
		}

		if (options.service_worker) {
			// always include service worker unless it's turned off explicitly
			csp.add_script(init_service_worker);

			head += `
				<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ''}>${init_service_worker}</script>`;
		}
	}

	if (state.prerender) {
		const http_equiv = [];

		const csp_headers = csp.get_meta();
		if (csp_headers) {
			http_equiv.push(csp_headers);
		}

		if (maxage) {
			http_equiv.push(`<meta http-equiv="cache-control" content="max-age=${maxage}">`);
		}

		if (http_equiv.length > 0) {
			head = http_equiv.join('\n') + head;
		}
	}

	const segments = url.pathname.slice(options.paths.base.length).split('/').slice(2);
	const assets =
		options.paths.assets || (segments.length > 0 ? segments.map(() => '..').join('/') : '.');

	const html = options.template({ head, body, assets, nonce: /** @type {string} */ (csp.nonce) });

	const headers = new Headers({
		'content-type': 'text/html',
		etag: `"${hash(html)}"`
	});

	if (maxage) {
		headers.set('cache-control', `${is_private ? 'private' : 'public'}, max-age=${maxage}`);
	}

	if (!options.floc) {
		headers.set('permissions-policy', 'interest-cohort=()');
	}

	if (!state.prerender) {
		const csp_header = csp.get_header();
		if (csp_header) {
			headers.set('content-security-policy', csp_header);
		}
	}

	return new Response(html, {
		status,
		headers
	});
}

/**
 * @param {any} data
 * @param {(error: Error) => void} [fail]
 */
function try_serialize(data, fail) {
	try {
		return devalue(data);
	} catch (err) {
		if (fail) fail(coalesce_to_error(err));
		return null;
	}
}

// Ensure we return something truthy so the client will not re-render the page over the error

/** @param {(Error & {frame?: string} & {loc?: object}) | undefined | null} error */
function serialize_error(error) {
	if (!error) return null;
	let serialized = try_serialize(error);
	if (!serialized) {
		const { name, message, stack } = error;
		serialized = try_serialize({ ...error, name, message, stack });
	}
	if (!serialized) {
		serialized = '{}';
	}
	return serialized;
}
