import { parseCookie, parseSetCookie, stringifySetCookie } from 'cookie';
import { DEV } from 'esm-env';
import { normalize_path, resolve } from '../../utils/url.js';
import { add_data_suffix } from '../pathname.js';
import { text_encoder } from '../utils.js';

/**
 * Tracks all cookies set during dev mode so we can emit warnings
 * when we detect that there's likely cookie misusage due to wrong paths
 *
 * @type {Record<string, Set<string>>} */
const cookie_paths = {};

/**
 * Cookies whose name and value combined are larger than this size are
 * discarded by browsers. This is the limit codified for the name/value pair
 * in RFC 6265bis: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-20#section-5.6-7.5.1
 */
const MAX_COOKIE_SIZE = 4096;

/**
 * Generates a unique key for a cookie based on its domain, path, and name in
 * the format: `<domain>/<path>?<name>`.
 * If domain is undefined, it will be omitted.
 * For example: `/?name`, `example.com/foo?name`.
 *
 * @param {string | undefined} domain
 * @param {string} path
 * @param {string} name
 * @returns {string}
 */
function generate_cookie_key(domain, path, name) {
	return `${domain || ''}${path}?${encodeURIComponent(name)}`;
}

/**
 * @param {Request} request
 * @param {URL} url
 */
export function get_cookies(request, url) {
	const header = request.headers.get('cookie') ?? '';
	const initial_cookies = /** @type {Record<string, string>} */ (
		parseCookie(header, { decode: (value) => value })
	);

	/** @type {ReturnType<typeof parseCookie> | undefined} */
	let default_cookies;

	/**
	 * The header never changes during the request, so the default-decode parse is cached
	 * @param {import('cookie').ParseOptions} [opts]
	 */
	function parse_header(opts) {
		return opts?.decode ? parseCookie(header, opts) : (default_cookies ??= parseCookie(header));
	}

	/** @param {import('./page/types.js').Cookie} cookie */
	function matches_url(cookie) {
		return (
			domain_matches(url.hostname, cookie.options.domain) &&
			path_matches(url.pathname, cookie.options.path)
		);
	}

	/** @type {string | undefined} */
	let normalized_url;

	/** @type {Map<string, import('./page/types.js').Cookie>} */
	const new_cookies = new Map();

	/** @type {Omit<import('cookie').SetCookie, 'name' | 'value'>} */
	const defaults = {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: !__SVELTEKIT_DEV__ && !(url.hostname === 'localhost' && url.protocol === 'http:')
	};

	/** @type {import('@sveltejs/kit').Cookies} */
	const cookies = {
		// The JSDoc param annotations appearing below for get, set and delete
		// are necessary to expose the `cookie` library types to
		// typescript users. `@type {import('@sveltejs/kit').Cookies}` above is not
		// sufficient to do so.

		get(name, opts) {
			// Look for the most specific matching cookie from new_cookies
			/** @type {import('./page/types.js').Cookie | undefined} */
			let best_match;
			for (const c of new_cookies.values()) {
				if (
					c.name === name &&
					matches_url(c) &&
					(!best_match || c.options.path.length > best_match.options.path.length)
				) {
					best_match = c;
				}
			}

			if (best_match) {
				return best_match.options.maxAge === 0 ? undefined : best_match.value;
			}

			const cookie = parse_header(opts)[name]; // the decoded string or undefined

			// in development, if the cookie was set during this session with `cookies.set`,
			// but at a different path, warn the user. (ignore cookies from request headers,
			// since we don't know which path they were set at)
			if (DEV && !cookie) {
				const paths = Array.from(cookie_paths[name] ?? []).filter((path) => {
					// we only care about paths that are _more_ specific than the current path
					return path_matches(path, url.pathname) && path !== url.pathname;
				});

				if (paths.length > 0) {
					console.warn(
						// prettier-ignore
						`'${name}' cookie does not exist for ${url.pathname}, but was previously set at ${conjoin([...paths])}. Did you mean to set its 'path' to '/' instead?`
					);
				}
			}

			return cookie;
		},

		getAll(opts) {
			// copy, so the cached parse isn't mutated below
			const cookies = { ...parse_header(opts) };

			// Group cookies by name and find the most specific one for each name
			const lookup = new Map();

			for (const c of new_cookies.values()) {
				if (matches_url(c)) {
					const existing = lookup.get(c.name);

					// If no existing cookie or this one has a more specific (longer) path, use this one
					if (!existing || c.options.path.length > existing.options.path.length) {
						lookup.set(c.name, c);
					}
				}
			}

			// Add the most specific cookies to the result
			for (const c of lookup.values()) {
				// tombstones (deleted cookies) shadow request-header cookies,
				// mirroring the behavior of `get()`
				if (c.options.maxAge === 0) {
					delete cookies[c.name];
				} else {
					cookies[c.name] = c.value;
				}
			}

			return /** @type {Array<{ name: string; value: string }>} */ (
				Object.entries(cookies)
					.filter(([, value]) => value != null)
					.map(([name, value]) => ({ name, value }))
			);
		},

		set(name, value, options) {
			set_internal(name, value, { ...defaults, ...options });
		},

		delete(name, options) {
			cookies.set(name, '', { ...options, maxAge: 0 });
		},

		parse: parseSetCookie,

		serialize(name, value, { encode, ...options }) {
			let path = options.path ?? '/';

			if (!options.domain || options.domain === url.hostname) {
				if (!normalized_url) {
					throw new Error('Cannot serialize cookies until after the route is determined');
				}
				path = resolve(normalized_url, path);
			}

			return stringifySetCookie({ name, value, ...defaults, ...options, path }, { encode });
		}
	};

	/**
	 * @param {URL} destination
	 * @param {string | null} header
	 */
	function get_cookie_header(destination, header) {
		/** @type {Record<string, string>} */
		const combined_cookies = {
			// cookies sent by the user agent have lowest precedence
			...initial_cookies
		};

		// cookies previous set during this event with cookies.set have higher precedence
		for (const cookie of new_cookies.values()) {
			if (!domain_matches(destination.hostname, cookie.options.domain)) continue;
			if (!path_matches(destination.pathname, cookie.options.path)) continue;

			const encoder = cookie.options.encode || encodeURIComponent;
			combined_cookies[cookie.name] = encoder(cookie.value);
		}

		// explicit header has highest precedence
		if (header) {
			const parsed = /** @type {Record<string, string>} */ (
				parseCookie(header, { decode: (value) => value })
			);
			for (const name in parsed) {
				combined_cookies[name] = parsed[name];
			}
		}

		return Object.entries(combined_cookies)
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');
	}

	/** @type {Array<() => void>} */
	const internal_queue = [];

	/**
	 * @param {string} name
	 * @param {string} value
	 * @param {import('cookie').SerializeOptions} options
	 */
	function set_internal(name, value, options) {
		if (!normalized_url) {
			internal_queue.push(() => set_internal(name, value, options));
			return;
		}

		let path = options.path ?? '/';

		if (!options.domain || options.domain === url.hostname) {
			path = resolve(normalized_url, path);
		}

		// Generate unique key for cookie storage
		const cookie_key = generate_cookie_key(options.domain, path, name);
		const cookie = { name, value, options: { ...options, path } };
		new_cookies.set(cookie_key, cookie);

		if (DEV) {
			const size =
				// only the name/value pair counts towards MAX_COOKIE_SIZE, not the other attributes
				text_encoder.encode(name).byteLength +
				text_encoder.encode((options.encode ?? encodeURIComponent)(value)).byteLength;

			if (size > MAX_COOKIE_SIZE) {
				throw new Error(`Cookie "${name}" is too large, and will be discarded by the browser`);
			}

			cookie_paths[name] ??= new Set();

			if (!value) {
				cookie_paths[name].delete(path);
			} else {
				cookie_paths[name].add(path);
			}
		}
	}

	/**
	 * @param {import('types').TrailingSlash} trailing_slash
	 */
	function set_trailing_slash(trailing_slash) {
		normalized_url = normalize_path(url.pathname, trailing_slash);
		internal_queue.forEach((fn) => fn());
	}

	return { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash };
}

/**
 * @param {string} hostname
 * @param {string} [constraint]
 */
export function domain_matches(hostname, constraint) {
	if (!constraint) return true;

	const normalized = constraint[0] === '.' ? constraint.slice(1) : constraint;

	if (hostname === normalized) return true;
	return hostname.endsWith('.' + normalized);
}

/**
 * @param {string} path
 * @param {string} [constraint]
 */
export function path_matches(path, constraint) {
	if (!constraint) return true;

	const normalized = constraint.endsWith('/') ? constraint.slice(0, -1) : constraint;

	if (path === normalized) return true;
	return path.startsWith(normalized + '/');
}

/**
 * @param {Headers} headers
 * @param {MapIterator<import('./page/types.js').Cookie>} cookies
 */
export function add_cookies_to_headers(headers, cookies) {
	for (const new_cookie of cookies) {
		const {
			name,
			value,
			options: { encode, ...options }
		} = new_cookie;
		headers.append('set-cookie', stringifySetCookie({ name, value, ...options }, { encode }));

		// special case — for routes ending with .html, the route data lives in a sibling
		// `.html__data.json` file rather than a child `/__data.json` file, which means
		// we need to duplicate the cookie
		if (options.path.endsWith('.html')) {
			const path = add_data_suffix(options.path);
			headers.append(
				'set-cookie',
				stringifySetCookie({ name, value, ...options, path }, { encode })
			);
		}
	}
}

/**
 * @param {string[]} array
 */
function conjoin(array) {
	if (array.length <= 2) return array.join(' and ');
	return `${array.slice(0, -1).join(', ')} and ${array.at(-1)}`;
}
