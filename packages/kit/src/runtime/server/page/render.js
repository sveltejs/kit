import devalue from 'devalue';
import { readable, writable } from 'svelte/store';
import { coalesce_to_error } from '../../../utils/error.js';
import { hash } from '../../hash.js';
import { render_json_payload_script } from '../../../utils/escape.js';
import { s } from '../../../utils/misc.js';
import { Csp, csp_ready } from './csp.js';
import { PrerenderingURL } from '../../../utils/url.js';
import { serialize_error } from '../utils.js';

// TODO rename this function/module

const updated = {
	...readable(false),
	check: () => false
};

/**
 * Creates the HTML response.
 * @param {{
 *   branch: Array<import('./types').Loaded>;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   $session: any;
 *   page_config: { hydrate: boolean, router: boolean };
 *   status: number;
 *   error: Error | null;
 *   event: import('types').RequestEvent;
 *   resolve_opts: import('types').RequiredResolveOptions;
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
	error = null,
	event,
	resolve_opts,
	stuff
}) {
	if (state.prerendering) {
		if (options.csp.mode === 'nonce') {
			throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
		}

		if (options.template_contains_nonce) {
			throw new Error('Cannot use prerendering if page template contains %sveltekit.nonce%');
		}
	}

	const { entry } = options.manifest._;

	const stylesheets = new Set(entry.stylesheets);
	const modulepreloads = new Set(entry.imports);

	/** @type {Map<string, string>} */
	// TODO if we add a client entry point one day, we will need to include inline_styles with the entry, otherwise stylesheets will be linked even if they are below inlineStyleThreshold
	const inline_styles = new Map();

	/** @type {Array<import('./types').Fetched>} */
	const serialized_data = [];

	let shadow_props;

	let rendered;

	let is_private = false;
	/** @type {import('types').NormalizedLoadOutputCache | undefined} */
	let cache;

	if (error) {
		error.stack = options.get_stack(error);
	}

	if (resolve_opts.ssr) {
		for (const { node, props, loaded, fetched, uses_credentials } of branch) {
			if (node.imports) {
				node.imports.forEach((url) => modulepreloads.add(url));
			}

			if (node.stylesheets) {
				node.stylesheets.forEach((url) => stylesheets.add(url));
			}

			if (node.inline_styles) {
				Object.entries(await node.inline_styles()).forEach(([k, v]) => inline_styles.set(k, v));
			}

			// TODO probably better if `fetched` wasn't populated unless `hydrate`
			if (fetched && page_config.hydrate) serialized_data.push(...fetched);
			if (props) shadow_props = props;

			cache = loaded?.cache;
			is_private = cache?.private ?? uses_credentials;
		}

		const session = writable($session);

		/** @type {Record<string, any>} */
		const props = {
			stores: {
				page: writable(null),
				navigating: writable(null),
				/** @type {import('svelte/store').Writable<App.Session>} */
				session: {
					...session,
					subscribe: (fn) => {
						is_private = cache?.private ?? true;
						return session.subscribe(fn);
					}
				},
				updated
			},
			/** @type {import('types').Page} */
			page: {
				error,
				params: event.params,
				routeId: event.routeId,
				status,
				stuff,
				url: state.prerendering ? new PrerenderingURL(event.url) : event.url
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

		rendered = options.root.render(props);
	} else {
		rendered = { head: '', html: '', css: { code: '', map: null } };
	}

	let { head, html: body } = rendered;

	await csp_ready;
	const csp = new Csp(options.csp, {
		dev: options.dev,
		prerender: !!state.prerendering,
		needs_nonce: options.template_contains_nonce
	});

	const target = hash(body);

	// prettier-ignore
	const init_app = `
		import { start } from ${s(options.prefix + entry.file)};
		start({
			target: document.querySelector('[data-sveltekit-hydrate="${target}"]').parentNode,
			paths: ${s(options.paths)},
			session: ${try_serialize($session, (error) => {
				throw new Error(`Failed to serialize session data: ${error.message}`);
			})},
			route: ${!!page_config.router},
			spa: ${!resolve_opts.ssr},
			trailing_slash: ${s(options.trailing_slash)},
			hydrate: ${resolve_opts.ssr && page_config.hydrate ? `{
				status: ${status},
				error: ${error && serialize_error(error, e => e.stack)},
				nodes: [${branch.map(({ node }) => node.index).join(', ')}],
				params: ${devalue(event.params)},
				routeId: ${s(event.routeId)}
			}` : 'null'}
		});
	`;

	// we use an anonymous function instead of an arrow function to support
	// older browsers (https://github.com/sveltejs/kit/pull/5417)
	const init_service_worker = `
		if ('serviceWorker' in navigator) {
			addEventListener('load', function () {
				navigator.serviceWorker.register('${options.service_worker}');
			});
		}
	`;

	if (inline_styles.size > 0) {
		const content = Array.from(inline_styles.values()).join('\n');

		const attributes = [];
		if (options.dev) attributes.push(' data-sveltekit');
		if (csp.style_needs_nonce) attributes.push(` nonce="${csp.nonce}"`);
		if (csp.report_only_style_needs_nonce) attributes.push(` nonce="${csp.report_only_nonce}"`);

		csp.add_style(content);

		head += `\n\t<style${attributes.join('')}>${content}</style>`;
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
      
      if (csp.report_only_style_needs_nonce) {
				attributes.push(`nonce="${csp.report_only_nonce}"`);
			}

			if (inline_styles.has(dep)) {
				// don't load stylesheets that are already inlined
				// include them in disabled state so that Vite can detect them and doesn't try to add them
				attributes.push('disabled', 'media="(max-width: 0)"');
			}

			return `\n\t<link ${attributes.join(' ')}>`;
		})
		.join('');

	if (page_config.router || page_config.hydrate) {
		head += Array.from(modulepreloads)
			.map((dep) => `\n\t<link rel="modulepreload" href="${options.prefix + dep}">`)
			.join('');

		const attributes = ['type="module"', `data-sveltekit-hydrate="${target}"`];

		csp.add_script(init_app);

		if (csp.script_needs_nonce) {
			attributes.push(`nonce="${csp.nonce}"`);
		}

		if (csp.report_only_script_needs_nonce) {
			attributes.push(`nonce="${csp.report_only_nonce}"`);
		}

		body += `\n\t\t<script ${attributes.join(' ')}>${init_app}</script>`;

		body += serialized_data
			.map(({ url, body, response }) =>
				render_json_payload_script(
					{ type: 'data', url, body: typeof body === 'string' ? hash(body) : undefined },
					response
				)
			)
			.join('\n\t');

		if (shadow_props) {
			body += render_json_payload_script({ type: 'props' }, shadow_props);
		}
	}

	if (options.service_worker) {
		// always include service worker unless it's turned off explicitly
		csp.add_script(init_service_worker);

		head += `
			<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ''}${
			csp.report_only_script_needs_nonce ? ` nonce="${csp.report_only_nonce}"` : ''
		}>${init_service_worker}</script>`;
	}

	if (state.prerendering) {
		const http_equiv = [];

		const csp_headers = csp.get_meta();
		if (csp_headers) {
			http_equiv.push(csp_headers);
		}

		if (cache) {
			http_equiv.push(`<meta http-equiv="cache-control" content="max-age=${cache.maxage}">`);
		}

		if (http_equiv.length > 0) {
			head = http_equiv.join('\n') + head;
		}
	}

	const segments = event.url.pathname.slice(options.paths.base.length).split('/').slice(2);
	const assets =
		options.paths.assets || (segments.length > 0 ? segments.map(() => '..').join('/') : '.');

	const html = await resolve_opts.transformPage({
		html: options.template({ head, body, assets, nonce: /** @type {string} */ (csp.nonce) })
	});

	const headers = new Headers({
		'content-type': 'text/html',
		etag: `"${hash(html)}"`
	});

	if (cache) {
		headers.set('cache-control', `${is_private ? 'private' : 'public'}, max-age=${cache.maxage}`);
	}

	if (!state.prerendering) {
		const csp_header = csp.get_header();
		if (csp_header) {
			headers.set('content-security-policy', csp_header);
		}
		const report_only_header = csp.get_report_only_header();
		if (report_only_header) {
			headers.set('content-security-policy-report-only', report_only_header);
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
