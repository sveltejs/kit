import { parse, serialize } from 'cookie';

/**
 * @param {Request} request
 * @param {URL} url
 */
export function get_cookies(request, url) {
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
			return req_cookies[name]; // the decoded string or undefined
		},

		/**
		 * @param {string} name
		 * @param {string} value
		 * @param {import('cookie').CookieSerializeOptions} opts
		 */
		set(name, value, opts = {}) {
			new_cookies[name] = {
				name,
				value,
				options: {
					...defaults,
					...opts
				}
			};
		},

		/**
		 * @param {string} name
		 * @param {import('cookie').CookieSerializeOptions} opts
		 */
		delete(name, opts = {}) {
			new_cookies[name] = {
				name,
				value: '',
				options: {
					...defaults,
					...opts,
					maxAge: 0
				}
			};
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
