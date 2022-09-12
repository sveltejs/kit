import * as cookie from 'cookie';

/**
 * @param {Request} request
 * @param {URL} url
 */
export function get_cookies(request, url) {
	const initial_cookies = cookie.parse(request.headers.get('cookie') ?? '');

	/** @type {Array<{ name: string, value: string, options: import('cookie').CookieSerializeOptions }>} */
	const new_cookies = [];

	/** @type {import('types').Cookies} */
	const cookies = {
		get(name, opts) {
			const decode = opts?.decode || decodeURIComponent;

			let i = new_cookies.length;
			while (i--) {
				const cookie = new_cookies[i];

				if (
					cookie.name === name &&
					domain_matches(url.hostname, cookie.options.domain) &&
					path_matches(url.pathname, cookie.options.path)
				) {
					return cookie.value;
				}
			}

			return name in initial_cookies ? decode(initial_cookies[name]) : undefined;
		},
		set(name, value, options = {}) {
			new_cookies.push({
				name,
				value,
				options: {
					httpOnly: true,
					secure: true,
					...options
				}
			});
		},
		delete(name) {
			new_cookies.push({ name, value: '', options: { expires: new Date(0) } });
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
