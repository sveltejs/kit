import * as cookie from 'cookie';
import * as set_cookie_parser from 'set-cookie-parser';
import { respond } from '../index.js';
import { is_root_relative, resolve } from '../../../utils/url.js';
import { domain_matches, path_matches } from './cookie.js';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   route: import('types').SSRRoute | import('types').SSRErrorPage;
 * }} opts
 */
export function create_fetch({ event, options, state, route }) {
	/** @type {import('./types').Fetched[]} */
	const fetched = [];

	const initial_cookies = cookie.parse(event.request.headers.get('cookie') || '');

	/** @type {import('set-cookie-parser').Cookie[]} */
	const cookies = [];

	/** @type {typeof fetch} */
	const fetcher = async (resource, opts = {}) => {
		/** @type {string} */
		let requested;

		if (typeof resource === 'string' || resource instanceof URL) {
			requested = resource.toString();
		} else {
			requested = resource.url;

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

		opts.headers = new Headers(opts.headers);

		// merge headers from request
		for (const [key, value] of event.request.headers) {
			if (
				key !== 'authorization' &&
				key !== 'connection' &&
				key !== 'content-length' &&
				key !== 'cookie' &&
				key !== 'host' &&
				key !== 'if-none-match' &&
				!opts.headers.has(key)
			) {
				opts.headers.set(key, value);
			}
		}

		const resolved = resolve(event.url.pathname, requested.split('?')[0]);

		/** @type {Response} */
		let response;

		/** @type {import('types').PrerenderDependency} */
		let dependency;

		// handle fetch requests for static assets. e.g. prebaked data, etc.
		// we need to support everything the browser's fetch supports
		const prefix = options.paths.assets || options.paths.base;
		const filename = decodeURIComponent(
			resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved
		).slice(1);
		const filename_html = `${filename}/index.html`; // path may also match path/index.html

		const is_asset = options.manifest.assets.has(filename);
		const is_asset_html = options.manifest.assets.has(filename_html);

		if (is_asset || is_asset_html) {
			const file = is_asset ? filename : filename_html;

			if (options.read) {
				const type = is_asset
					? options.manifest.mimeTypes[filename.slice(filename.lastIndexOf('.'))]
					: 'text/html';

				response = new Response(options.read(file), {
					headers: type ? { 'content-type': type } : {}
				});
			} else {
				response = await fetch(`${event.url.origin}/${file}`, /** @type {RequestInit} */ (opts));
			}
		} else if (is_root_relative(resolved)) {
			if (opts.credentials !== 'omit') {
				const authorization = event.request.headers.get('authorization');

				// combine cookies from the initiating request with any that were
				// added via set-cookie
				const combined_cookies = { ...initial_cookies };

				for (const cookie of cookies) {
					if (!domain_matches(event.url.hostname, cookie.domain)) continue;
					if (!path_matches(resolved, cookie.path)) continue;

					combined_cookies[cookie.name] = cookie.value;
				}

				const cookie = Object.entries(combined_cookies)
					.map(([name, value]) => `${name}=${value}`)
					.join('; ');

				if (cookie) {
					opts.headers.set('cookie', cookie);
				}

				if (authorization && !opts.headers.has('authorization')) {
					opts.headers.set('authorization', authorization);
				}
			}

			if (opts.body && typeof opts.body !== 'string') {
				// per https://developer.mozilla.org/en-US/docs/Web/API/Request/Request, this can be a
				// Blob, BufferSource, FormData, URLSearchParams, USVString, or ReadableStream object.
				// non-string bodies are irksome to deal with, but luckily aren't particularly useful
				// in this context anyway, so we take the easy route and ban them
				throw new Error('Request body must be a string');
			}

			response = await respond(
				new Request(new URL(requested, event.url).href, { ...opts }),
				options,
				{
					...state,
					initiator: route
				}
			);

			if (state.prerendering) {
				dependency = { response, body: null };
				state.prerendering.dependencies.set(resolved, dependency);
			}
		} else {
			// external
			if (resolved.startsWith('//')) {
				requested = event.url.protocol + requested;
			}

			// external fetch
			// allow cookie passthrough for "same-origin"
			// if SvelteKit is serving my.domain.com:
			// -        domain.com WILL NOT receive cookies
			// -     my.domain.com WILL receive cookies
			// -    api.domain.dom WILL NOT receive cookies
			// - sub.my.domain.com WILL receive cookies
			// ports do not affect the resolution
			// leading dot prevents mydomain.com matching domain.com
			if (
				`.${new URL(requested).hostname}`.endsWith(`.${event.url.hostname}`) &&
				opts.credentials !== 'omit'
			) {
				const cookie = event.request.headers.get('cookie');
				if (cookie) opts.headers.set('cookie', cookie);
			}

			// we need to delete the connection header, as explained here:
			// https://github.com/nodejs/undici/issues/1470#issuecomment-1140798467
			// TODO this may be a case for being selective about which headers we let through
			opts.headers.delete('connection');

			const external_request = new Request(requested, /** @type {RequestInit} */ (opts));
			response = await options.hooks.externalFetch.call(null, external_request);
		}

		const set_cookie = response.headers.get('set-cookie');
		if (set_cookie) {
			cookies.push(
				...set_cookie_parser
					.splitCookiesString(set_cookie)
					.map((str) => set_cookie_parser.parseString(str))
			);
		}

		const proxy = new Proxy(response, {
			get(response, key, _receiver) {
				async function text() {
					const body = await response.text();

					/** @type {import('types').ResponseHeaders} */
					const headers = {};
					for (const [key, value] of response.headers) {
						// TODO skip others besides set-cookie and etag?
						if (key !== 'set-cookie' && key !== 'etag') {
							headers[key] = value;
						}
					}

					if (!opts.body || typeof opts.body === 'string') {
						const status_number = Number(response.status);
						if (isNaN(status_number)) {
							throw new Error(
								`response.status is not a number. value: "${
									response.status
								}" type: ${typeof response.status}`
							);
						}

						fetched.push({
							url: requested,
							body: opts.body,
							response: {
								status: status_number,
								statusText: response.statusText,
								headers,
								body
							}
						});
					}

					if (dependency) {
						dependency.body = body;
					}

					return body;
				}

				if (key === 'arrayBuffer') {
					return async () => {
						const buffer = await response.arrayBuffer();

						if (dependency) {
							dependency.body = new Uint8Array(buffer);
						}

						// TODO should buffer be inlined into the page (albeit base64'd)?
						// any conditions in which it shouldn't be?

						return buffer;
					};
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

				return Reflect.get(response, key, response);
			}
		});

		return proxy;
	};

	return { fetcher, fetched, cookies };
}
