import { parse, serialize } from 'cookie';
import { normalize_path } from '../../utils/url.js';

/**
 * Tracks all cookies set during dev mode so we can emit warnings
 * when we detect that there's likely cookie misusage due to wrong paths
 *
 * @type {Record<string, Set<string>>} */
const cookie_paths = {};

/**
 * @param {Request} request
 * @param {URL} url
 * @param {boolean} dev
 * @param {import('types').TrailingSlash} trailing_slash
 */
export function get_cookies(request, url, dev, trailing_slash) {
	const header = request.headers.get('cookie') ?? '';
	const initial_cookies = parse(header, { decode: (value) => value });

	const normalized_url = normalize_path(url.pathname, trailing_slash);
	// Emulate browser-behavior: if the cookie is set at '/foo/bar', its path is '/foo'
	const default_path = normalized_url.split('/').slice(0, -1).join('/') || '/';

	if (dev) {
		// TODO this could theoretically be wrong if the cookie was set unencoded?
		const initial_decoded_cookies = parse(header, { decode: decodeURIComponent });
		// Remove all cookies that no longer exist according to the request
		for (const name of Object.keys(cookie_paths)) {
			cookie_paths[name] = new Set(
				[...cookie_paths[name]].filter(
					(path) => !path_matches(normalized_url, path) || name in initial_decoded_cookies
				)
			);
		}
		// Add all new cookies we might not have seen before
		for (const name in initial_decoded_cookies) {
			cookie_paths[name] = cookie_paths[name] ?? new Set();
			if (![...cookie_paths[name]].some((path) => path_matches(normalized_url, path))) {
				cookie_paths[name].add(default_path);
			}
		}
	}

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

			const decoder = opts?.decode || decodeURIComponent;
			const req_cookies = parse(header, { decode: decoder });
			const cookie = req_cookies[name]; // the decoded string or undefined

			if (!dev || cookie) {
				return cookie;
			}

			const paths = new Set([...(cookie_paths[name] ?? [])]);
			if (c) {
				paths.add(c.options.path ?? default_path);
			}
			if (paths.size > 0) {
				console.warn(
					// prettier-ignore
					`Cookie with name '${name}' was not found at path '${url.pathname}', but a cookie with that name exists at these paths: '${[...paths].join("', '")}'. Did you mean to set its 'path' to '/' instead?`
				);
			}
		},

		/**
		 * @param {string} name
		 * @param {string} value
		 * @param {import('cookie').CookieSerializeOptions} opts
		 */
		set(name, value, opts = {}) {
			let path = opts.path ?? default_path;

			new_cookies[name] = {
				name,
				value,
				options: {
					...defaults,
					...opts,
					path
				}
			};

			if (dev) {
				cookie_paths[name] = cookie_paths[name] ?? new Set();
				if (!value) {
					if (!cookie_paths[name].has(path) && cookie_paths[name].size > 0) {
						const paths = `'${Array.from(cookie_paths[name]).join("', '")}'`;
						console.warn(
							`Trying to delete cookie '${name}' at path '${path}', but a cookie with that name only exists at these paths: ${paths}.`
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
		const combined_cookies = {
			// cookies sent by the user agent have lowest precedence
			...initial_cookies
		};

		// cookies previous set during this event with cookies.set have higher precedence
		for (const key in new_cookies) {
			const cookie = new_cookies[key];
			if (!domain_matches(destination.hostname, cookie.options.domain)) continue;
			if (!path_matches(destination.pathname, cookie.options.path)) continue;

			const encoder = cookie.options.encode || encodeURIComponent;
			combined_cookies[cookie.name] = encoder(cookie.value);
		}

		// explicit header has highest precedence
		if (header) {
			const parsed = parse(header, { decode: (value) => value });
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
