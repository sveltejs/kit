import fetch, { Response } from 'node-fetch';
import { parse, resolve } from 'url';
import { normalize } from '../../load.js';
import { ssr } from '../index.js';

const s = JSON.stringify;

/**
 *
 * @param {{
 *   request: import('types').Request;
 *   options: import('types/internal').SSRRenderOptions;
 *   route: import('types/internal').SSRPage;
 *   page: import('types').Page;
 *   node: import('types/internal').SSRNode;
 *   $session: any;
 *   context: Record<string, any>;
 *   is_leaf: boolean;
 *   is_error: boolean;
 *   status?: number;
 *   error?: Error;
 * }} opts
 * @returns {Promise<import('./types').Loaded>}
 */
export async function load_node({
	request,
	options,
	route,
	page,
	node,
	$session,
	context,
	is_leaf,
	is_error,
	status,
	error
}) {
	const { module } = node;

	let uses_credentials = false;

	/** @type {Array<{
	 *   url: string;
	 *   json: string;
	 * }>} */
	const fetched = [];

	let loaded;

	if (module.load) {
		/** @type {import('types/internal').LoadInput | import('types/internal').ErrorLoadInput} */
		const load_input = {
			page,
			get session() {
				uses_credentials = true;
				return $session;
			},
			/**
			 * @param {RequestInfo} resource
			 * @param {RequestInit} opts
			 */
			// @ts-ignore mismatch between client fetch and node-fetch
			fetch: async (resource, opts = {}) => {
				/** @type {string} */
				let url;

				if (typeof resource === 'string') {
					url = resource;
				} else {
					url = resource.url;

					opts = {
						method: resource.method,
						headers: resource.headers,
						body: resource.body,
						mode: resource.mode,
						credentials: resource.credentials,
						cache: resource.cache,
						redirect: resource.redirect,
						referrer: resource.referrer,
						integrity: resource.integrity,
						...opts
					};
				}

				if (options.local && url.startsWith(options.paths.assets)) {
					// when running `start`, or prerendering, `assets` should be
					// config.kit.paths.assets, but we should still be able to fetch
					// assets directly from `static`
					url = url.replace(options.paths.assets, '');
				}

				const parsed = parse(url);

				let response;

				if (parsed.protocol) {
					// external fetch
					response = await fetch(
						parsed.href,
						/** @type {import('node-fetch').RequestInit} */ (opts)
					);
				} else {
					// otherwise we're dealing with an internal fetch
					const resolved = resolve(request.path, parsed.pathname);

					// handle fetch requests for static assets. e.g. prebaked data, etc.
					// we need to support everything the browser's fetch supports
					const filename = resolved.slice(1);
					const filename_html = `${filename}/index.html`; // path may also match path/index.html
					const asset = options.manifest.assets.find(
						(d) => d.file === filename || d.file === filename_html
					);

					if (asset) {
						// we don't have a running server while prerendering because jumping between
						// processes would be inefficient so we have get_static_file instead
						if (options.get_static_file) {
							response = new Response(options.get_static_file(asset.file), {
								headers: {
									'content-type': asset.type
								}
							});
						} else {
							// TODO we need to know what protocol to use
							response = await fetch(
								`http://${page.host}/${asset.file}`,
								/** @type {import('node-fetch').RequestInit} */ (opts)
							);
						}
					}

					if (!response) {
						const headers = /** @type {import('types/internal').Headers} */ ({ ...opts.headers });

						// TODO: fix type https://github.com/node-fetch/node-fetch/issues/1113
						if (opts.credentials !== 'omit') {
							uses_credentials = true;

							headers.cookie = request.headers.cookie;

							if (!headers.authorization) {
								headers.authorization = request.headers.authorization;
							}
						}

						const rendered = await ssr(
							{
								host: request.host,
								method: opts.method || 'GET',
								headers,
								path: resolved,
								body: /** @type {any} */ (opts.body),
								query: new URLSearchParams(parsed.query || '')
							},
							{
								...options,
								fetched: url,
								initiator: route
							}
						);

						if (rendered) {
							if (options.dependencies) {
								options.dependencies.set(resolved, rendered);
							}

							response = new Response(rendered.body, {
								status: rendered.status,
								headers: rendered.headers
							});
						}
					}
				}

				if (response) {
					const proxy = new Proxy(response, {
						get(response, key, receiver) {
							async function text() {
								const body = await response.text();

								/** @type {import('types/internal').Headers} */
								const headers = {};
								response.headers.forEach((value, key) => {
									if (key !== 'etag' && key !== 'set-cookie') headers[key] = value;
								});

								// prettier-ignore
								fetched.push({
									url,
									json: `{"status":${response.status},"statusText":${s(response.statusText)},"headers":${s(headers)},"body":${escape(body)}}`
								});

								return body;
							}

							if (key === 'text') {
								return text;
							}

							if (key === 'json') {
								return async () => {
									return JSON.parse(await text());
								};
							}

							// TODO arrayBuffer?

							return Reflect.get(response, key, receiver);
						}
					});

					return proxy;
				}

				return (
					response ||
					new Response('Not found', {
						status: 404
					})
				);
			},
			context: { ...context }
		};

		if (is_error) {
			/** @type {import('types/internal').ErrorLoadInput} */ (load_input).status = status;
			/** @type {import('types/internal').ErrorLoadInput} */ (load_input).error = error;
		}

		loaded = await module.load.call(null, load_input);
	} else {
		loaded = {};
	}

	// if leaf node (i.e. page component) has a load function
	// that returns nothing, we fall through to the next one
	if (!loaded && is_leaf && !is_error) return;

	return {
		node,
		loaded: normalize(loaded),
		context: loaded.context || context,
		fetched,
		uses_credentials
	};
}

/** @type {Record<string, string>} */
const escaped = {
	'<': '\\u003C',
	'>': '\\u003E',
	'/': '\\u002F',
	'\\': '\\\\',
	'\b': '\\b',
	'\f': '\\f',
	'\n': '\\n',
	'\r': '\\r',
	'\t': '\\t',
	'\0': '\\0',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

/** @param {string} str */
function escape(str) {
	let result = '"';

	for (let i = 0; i < str.length; i += 1) {
		const char = str.charAt(i);
		const code = char.charCodeAt(0);

		if (char === '"') {
			result += '\\"';
		} else if (char in escaped) {
			result += escaped[char];
		} else if (code >= 0xd800 && code <= 0xdfff) {
			const next = str.charCodeAt(i + 1);

			// If this is the beginning of a [high, low] surrogate pair,
			// add the next two characters, otherwise escape
			if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
				result += char + str[++i];
			} else {
				result += `\\u${code.toString(16).toUpperCase()}`;
			}
		} else {
			result += char;
		}
	}

	result += '"';
	return result;
}
