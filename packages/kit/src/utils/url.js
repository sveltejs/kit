import { BROWSER, DEV } from 'esm-env';
import { try_get_request_store } from '../exports/internal/event.js';

/**
 * Matches a URI scheme. See https://www.rfc-editor.org/rfc/rfc3986#section-3.1
 * @type {RegExp}
 */
export const SCHEME = /^[a-z][a-z\d+\-.]*:/i;
// See https://datatracker.ietf.org/doc/html/rfc2606 - no domains under the .invalid TLD can be registered
const REDIRECT_BASE = 'https://sveltekit-redirect.invalid';

const internal = new URL('a://');

/**
 * @param {string} base
 * @param {string} path
 */
export function resolve(base, path) {
	// special case
	if (path[0] === '/' && path[1] === '/') return path;

	let url = new URL(base, internal);
	url = new URL(path, url);

	return url.protocol === internal.protocol ? url.pathname + url.search + url.hash : url.href;
}

/** @param {string} path */
export function is_root_relative(path) {
	return path[0] === '/' && path[1] !== '/';
}

/**
 * Whether a redirect location is absolute, i.e. not a root-relative or path-relative URL,
 * and not pointing to the same origin as we're currently on (if determineable).
 * @param {string} location
 */
export function is_external_location(location) {
	const origin = BROWSER ? window.location.origin : try_get_request_store()?.event.url.origin;

	try {
		return !matches_external_allowlist_entry(location, origin ?? REDIRECT_BASE);
	} catch {
		return true;
	}
}

/**
 * @param {string} location
 */
function is_javascript_location(location) {
	try {
		return new URL(location, REDIRECT_BASE).protocol === 'javascript:';
	} catch {
		return false;
	}
}

/**
 * @param {string} location
 * @param {string} allowed
 */
export function matches_external_allowlist_entry(location, allowed) {
	if (location === allowed) return true;

	try {
		const allow = new URL(allowed);
		const loc = new URL(location, allow);

		// this is stricter than `loc.origin === allow.origin`, which can fail in `blob:` cases
		return loc.protocol === allow.protocol && loc.host === allow.host;
	} catch {
		return false;
	}
}

/**
 * @param {string} location
 * @param {{ external?: boolean | string[] }} [options]
 */
export function validate_redirect_location(location, options) {
	if (!is_external_location(location)) return;

	const external = options?.external;

	if (!external) {
		throw new Error(
			DEV
				? `Cannot redirect to external URL ${JSON.stringify(location)}. ` +
						'To redirect to an external URL, pass `{ external: true }` or an allowlist of permitted origins as the third argument to `redirect`'
				: 'Cannot redirect to external URL unless explicitly allowed'
		);
	}

	if (external === true) {
		if (is_javascript_location(location)) {
			throw new Error(
				DEV
					? `Cannot redirect to ${JSON.stringify(location)} with \`{ external: true }\`. ` +
							'The `:javascript` protocol must be explicitly listed in the `external` allowlist'
					: 'Cannot redirect to external URL unless explicitly allowed'
			);
		}

		return;
	}

	if (Array.isArray(external)) {
		if (!external.some((allowed) => matches_external_allowlist_entry(location, allowed))) {
			throw new Error(
				DEV
					? `Cannot redirect to ${JSON.stringify(location)}: URL origin is not included in the \`external\` allowlist`
					: 'Cannot redirect to external URL unless explicitly allowed'
			);
		}

		return;
	}

	throw new Error(
		DEV
			? '`redirect` options.external must be `true` or an array of allowed origins'
			: 'Invalid redirect options.external value'
	);
}

/**
 * @param {string} path
 * @param {import('types').TrailingSlash} trailing_slash
 */
export function normalize_path(path, trailing_slash) {
	if (path === '/' || trailing_slash === 'ignore') return path;

	if (trailing_slash === 'never') {
		return path.endsWith('/') ? path.slice(0, -1) : path;
	} else if (trailing_slash === 'always' && !path.endsWith('/')) {
		return path + '/';
	}

	return path;
}

/**
 * Decode pathname excluding %25 to prevent further double decoding of params
 * @param {string} pathname
 */
export function decode_pathname(pathname) {
	return pathname.split('%25').map(decodeURI).join('%25');
}

/** @param {Record<string, string>} params */
export function decode_params(params) {
	for (const key in params) {
		// input has already been decoded by decodeURI
		// now handle the rest
		params[key] = decodeURIComponent(params[key]);
	}

	return params;
}

/**
 * The error when a URL is malformed is not very helpful, so we augment it with the URI
 * @param {string} uri
 */
export function decode_uri(uri) {
	try {
		return decodeURI(uri);
	} catch (e) {
		if (e instanceof Error) {
			e.message = `Failed to decode URI: ${uri}\n` + e.message;
		}
		throw e;
	}
}

/**
 * Returns everything up to the first `#` in a URL
 * @param {{href: string}} url_like
 */
export function strip_hash({ href }) {
	return href.split('#')[0];
}

/**
 * @param {URL} url
 * @param {() => void} callback
 * @param {(search_param: string) => void} search_params_callback
 * @param {boolean} [allow_hash]
 */
export function make_trackable(url, callback, search_params_callback, allow_hash = false) {
	const tracked = new URL(url);

	Object.defineProperty(tracked, 'searchParams', {
		value: new Proxy(tracked.searchParams, {
			get(obj, key) {
				if (key === 'get' || key === 'getAll' || key === 'has') {
					return (/** @type {string} */ param, /** @type {string[]} */ ...rest) => {
						search_params_callback(param);
						return obj[key](param, ...rest);
					};
				}

				// if they try to access something different from what is in `tracked_search_params_properties`
				// we track the whole url (entries, values, keys etc)
				callback();

				const value = Reflect.get(obj, key);
				return typeof value === 'function' ? value.bind(obj) : value;
			}
		}),
		enumerable: true,
		configurable: true
	});

	/**
	 * URL properties that could change during the lifetime of the page,
	 * which excludes things like `origin`
	 * @type {(keyof URL)[]}
	 */
	const tracked_url_properties = ['href', 'pathname', 'search', 'toString', 'toJSON'];
	if (allow_hash) tracked_url_properties.push('hash');

	for (const property of tracked_url_properties) {
		Object.defineProperty(tracked, property, {
			get() {
				callback();
				return url[property];
			},

			enumerable: true,
			configurable: true
		});
	}

	if (!BROWSER) {
		// @ts-ignore
		tracked[Symbol.for('nodejs.util.inspect.custom')] = (_depth, opts, inspect) => {
			return inspect(url, opts);
		};

		// @ts-ignore
		tracked.searchParams[Symbol.for('nodejs.util.inspect.custom')] = (_depth, opts, inspect) => {
			return inspect(url.searchParams, opts);
		};
	}

	if ((DEV || !BROWSER) && !allow_hash) {
		disable_hash(tracked);
	}

	return tracked;
}

/**
 * Disallow access to `url.hash` on the server and in `load`
 * @param {URL} url
 */
function disable_hash(url) {
	allow_nodejs_console_log(url);

	Object.defineProperty(url, 'hash', {
		get() {
			throw new Error(
				'Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead'
			);
		}
	});
}

/**
 * Disallow access to `url.search` and `url.searchParams` during prerendering
 * @param {URL} url
 */
export function disable_search(url) {
	allow_nodejs_console_log(url);

	for (const property of ['search', 'searchParams']) {
		Object.defineProperty(url, property, {
			get() {
				throw new Error(`Cannot access url.${property} on a page with prerendering enabled`);
			}
		});
	}
}

/**
 * Allow URL to be console logged, bypassing disabled properties.
 * @param {URL} url
 */
function allow_nodejs_console_log(url) {
	if (!BROWSER) {
		// @ts-ignore
		url[Symbol.for('nodejs.util.inspect.custom')] = (_depth, opts, inspect) => {
			return inspect(new URL(url), opts);
		};
	}
}
