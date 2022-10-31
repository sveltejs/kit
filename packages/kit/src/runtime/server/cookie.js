import { parse, serialize } from 'cookie';
import { has_data_suffix, normalize_path, strip_data_suffix } from '../../utils/url.js';

/**
 * Tracks all cookies set during dev mode so we can emit warnings
 * when we detect that there's likely cookie misusage due to wrong paths
 *
 * @type {Record<string, Set<string>>} */
const cookie_paths = {};

/**
 * @param {Request} request
 * @param {URL} url
 * @param {Pick<import('types').SSROptions, 'dev' | 'trailing_slash'>} options
 */
export function get_cookies(request, url, options) {
	const header = request.headers.get('cookie') ?? '';

	const initial_cookies = parse(header);

	/** @type {Record<string, import('./page/types').Cookie>} */
	const new_cookies = {};

	/** @type {import('cookie').CookieSerializeOptions} */
	const defaults = {
		httpOnly: true,
		sameSite: 'lax',
		secure: url.hostname === 'localhost' && url.protocol === 'http:' ? false : true
	};

	/** @type {import('types').Cookies} */
	const cookies = {
		// The JSDoc param annotations appearing below for get, set and delete
		// are necessary to expose the `cookie` library types to
		// typescript users. `@type {import('types').Cookies}` above is not
		// sufficient to do so.

		/**
		 * @param {string} name
		 * @param {import('cookie').CookieParseOptions} opts
		 */
		get(name, opts) {
			const c = new_cookies[name];
			if (
				c &&
				domain_matches(url.hostname, c.options.domain) &&
				path_matches(url.pathname, c.options.path)
			) {
				return c.value;
			}

			const decode = opts?.decode || decodeURIComponent;
			const req_cookies = parse(header, { decode });
			const cookie = req_cookies[name]; // the decoded string or undefined

			if (!options.dev || cookie) {
				return cookie;
			}

			if (c || cookie_paths[name]?.size > 0) {
				console.warn(
					`Cookie with name '${name}' was not found, but a cookie with that name exists at a sub path. Did you mean to set its 'path' to '/'?`
				);
			}
		},

		/**
		 * @param {string} name
		 * @param {string} value
		 * @param {import('cookie').CookieSerializeOptions} opts
		 */
		set(name, value, opts = {}) {
			let path = opts.path;
			if (!path) {
				const normalized = normalize_path(
					// Remove suffix: 'foo/__data.json' would mean the cookie path is '/foo',
					// whereas a direct hit of /foo would mean the cookie path is '/'
					has_data_suffix(url.pathname) ? strip_data_suffix(url.pathname) : url.pathname,
					options.trailing_slash
				);
				// Emulate browser-behavior: if the cookie is set at '/foo/bar', its path is '/foo'
				path = normalized.split('/').slice(0, -1).join('/') || '/';
			}

			new_cookies[name] = {
				name,
				value,
				options: {
					...defaults,
					...opts,
					path
				}
			};

			if (options.dev) {
				cookie_paths[name] = cookie_paths[name] || new Set();
				if (!value) {
					if (!cookie_paths[name].has(path) && cookie_paths[name].size > 0) {
						console.warn(
							`Trying to delete cookie '${name}' at path '${path}', but a cookie with that name only exists at a different path.`
						);
					}
					cookie_paths[name].delete(path);
				} else {
					// We could also emit a warning here if the cookie already exists at a different path,
					// but that's more likely a false positive because it's valid to set the same name at different paths
					cookie_paths[name].add(path);
				}
			}
		},

		/**
		 * @param {string} name
		 * @param {import('cookie').CookieSerializeOptions} opts
		 */
		delete(name, opts = {}) {
			cookies.set(name, '', {
				...opts,
				maxAge: 0
			});
		},

		/**
		 * @param {string} name
		 * @param {string} value
		 * @param {import('cookie').CookieSerializeOptions} opts
		 */
		serialize(name, value, opts) {
			return serialize(name, value, {
				...defaults,
				...opts
			});
		}
	};

	/**
	 * @param {URL} destination
	 * @param {string | null} header
	 */
	function get_cookie_header(destination, header) {
		/** @type {Record<string, string>} */
		const combined_cookies = {};

		// cookies sent by the user agent have lowest precedence
		for (const name in initial_cookies) {
			combined_cookies[name] = initial_cookies[name];
		}

		// cookies previous set during this event with cookies.set have higher precedence
		for (const key in new_cookies) {
			const cookie = new_cookies[key];
			if (!domain_matches(destination.hostname, cookie.options.domain)) continue;
			if (!path_matches(destination.pathname, cookie.options.path)) continue;

			combined_cookies[cookie.name] = cookie.value;
		}

		// explicit header has highest precedence
		if (header) {
			const parsed = parse(header);
			for (const name in parsed) {
				combined_cookies[name] = parsed[name];
			}
		}

		return Object.entries(combined_cookies)
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');
	}

	return { cookies, new_cookies, get_cookie_header };
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
 * @param {import('./page/types').Cookie[]} cookies
 */
export function add_cookies_to_headers(headers, cookies) {
	for (const new_cookie of cookies) {
		const { name, value, options } = new_cookie;
		headers.append('set-cookie', serialize(name, value, options));
	}
}
