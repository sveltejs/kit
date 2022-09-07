import * as cookie from 'cookie';

/**
 * @param {Request} request
 * @param {URL} url
 */
export function get_cookies(request, url) {
	const initial_cookies = cookie.parse(request.headers.get('cookie') ?? '');

	/** @type {Map<string, { name: string, value: string, options: import('cookie').CookieSerializeOptions }>} */
	const new_cookies = new Map();

	/** @type {import('types').Cookies} */
	const cookies = {
		get(name, opts) {
			const decode = opts?.decode || decodeURIComponent;
			const c = new_cookies.get(name);
			if (
				c &&
				domain_matches(url.hostname, c.options.domain) &&
				path_matches(url.pathname, c.options.path)
			) {
				return c.value;
			}

			return name in initial_cookies ? decode(initial_cookies[name]) : undefined;
		},

		set(name, value, options = {}) {
			new_cookies.set(name, {
				name,
				value,
				options: {
					httpOnly: true,
					secure: true,
					path: '/',
					...options
				}
			});
		},
		delete(name, options = {}) {
			new_cookies.set(name, {
				name,
				value: '',
				options: {
					httpOnly: true,
					secure: true,
					path: '/',
					...options,
					maxAge: 0
				}
			});
			delete initial_cookies[name];
		}
	};

	return { cookies, new_cookies };
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
