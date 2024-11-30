import { parse, serialize } from 'cookie';

/**
 * Tracks all cookies set during dev mode so we can emit warnings
 * when we detect that there's likely cookie misusage due to wrong paths
 *
 * @type {Record<string, Set<string>>} */
const cookie_paths = {};

/**
 * Cookies that are larger than this size (including the name and other
 * attributes) are discarded by browsers
 */
const MAX_COOKIE_SIZE = 4129;

// TODO 3.0 remove this check
/** @param {import('../../types/internal.js').Cookie['options']} options */
function validate_options(options) {
	if (options?.path === undefined) {
		throw new Error('You must specify a `path` when setting, deleting or serializing cookies');
	}
}

/**
 * @param {URL} url
 */
export function get_cookies(url) {
	/** @type {import('cookie').CookieSerializeOptions} */
	const defaults = {
		httpOnly: false,
		sameSite: 'lax',
		secure: url.hostname === 'localhost' && url.protocol === 'http:' ? false : true
	};

	/** @type {import('@sveltejs/kit').Cookies} */
	const cookies = {
		// The JSDoc param annotations appearing below for get, set and delete
		// are necessary to expose the `cookie` library types to
		// typescript users. `@type {import('@sveltejs/kit').Cookies}` above is not
		// sufficient to do so.

		/**
		 * @param {string} name
		 * @param {import('cookie').CookieParseOptions} opts
		 */
		get(name, opts) {
			const decoder = opts?.decode || decodeURIComponent;
			const req_cookies = parse(document.cookie, { decode: decoder });
			const cookie = req_cookies[name]; // the decoded string or undefined

			// in development, if the cookie was set during this session with `cookies.set`,
			// but at a different path, warn the user. (ignore cookies from request headers,
			// since we don't know which path they were set at)
			if (__SVELTEKIT_DEV__ && !cookie) {
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

		/**
		 * @param {import('cookie').CookieParseOptions} opts
		 */
		getAll(opts) {
			const decoder = opts?.decode || decodeURIComponent;
			const cookies = parse(document.cookie, { decode: decoder });
			return Object.entries(cookies).map(([name, value]) => ({ name, value }));
		},

		/**
		 * @param {string} name
		 * @param {string} value
		 * @param {import('../../types/internal.js').Cookie['options']} options
		 */
		set(name, value, options) {
			validate_options(options);
			set_internal(name, value, { ...defaults, ...options });
		},

		/**
		 * @param {string} name
		 *  @param {import('../../types/internal.js').Cookie['options']} options
		 */
		delete(name, options) {
			validate_options(options);
			cookies.set(name, '', { ...options, maxAge: 0 });
		},

		/**
		 * @param {string} name
		 * @param {string} value
		 *  @param {import('../../types/internal.js').Cookie['options']} options
		 */
		serialize(name, value, options) {
			validate_options(options);
			return serialize(name, value, { ...defaults, ...options });
		}
	};

	/**
	 * @param {string} name
	 * @param {string} value
	 * @param {import('../../types/internal.js').Cookie['options']} options
	 */
	function set_internal(name, value, options) {
		const serialized = serialize(name, value, options);
		document.cookie = serialized;

		if (__SVELTEKIT_DEV__) {
			if (new TextEncoder().encode(serialized).byteLength > MAX_COOKIE_SIZE) {
				throw new Error(`Cookie "${name}" is too large, and will be discarded by the browser`);
			}

			cookie_paths[name] ??= new Set();

			if (!value) {
				cookie_paths[name].delete(options.path);
			} else {
				cookie_paths[name].add(options.path);
			}
		}
	}

	return cookies;
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
 * @param {string[]} array
 */
function conjoin(array) {
	if (array.length <= 2) return array.join(' and ');
	return `${array.slice(0, -1).join(', ')} and ${array.at(-1)}`;
}
