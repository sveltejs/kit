import { BROWSER, DEV } from 'esm-env';

/**
 * Matches a URI scheme. See https://www.rfc-editor.org/rfc/rfc3986#section-3.1
 * @type {RegExp}
 */
export const SCHEME = /^[a-z][a-z\d+\-.]+:/i;

const internal = new URL('sveltekit-internal://');

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

/**
 * Encodes named form action query parameter keys such as `?/login` to `?%2Flogin`.
 * This keeps the URL semantically identical while avoiding raw `/` characters in the query string.
 * @param {string} query
 */
function encode_named_action_query(query) {
	const parts = query.split(/(&amp;|&)/);
	let changed = false;

	for (let i = 0; i < parts.length; i += 2) {
		const segment = parts[i];
		const equals = segment.indexOf('=');
		const key = equals === -1 ? segment : segment.slice(0, equals);

		if (key.startsWith('/')) {
			parts[i] = encodeURIComponent(key) + segment.slice(key.length);
			changed = true;
		}
	}

	return changed ? parts.join('') : query;
}

/**
 * @param {string} url
 */
export function normalize_named_action_url(url) {
	const query_start = url.indexOf('?');
	if (query_start === -1) return url;

	const hash_start = url.indexOf('#', query_start);
	const query_end = hash_start === -1 ? url.length : hash_start;
	const query = url.slice(query_start + 1, query_end);
	const normalized = encode_named_action_query(query);

	return normalized === query
		? url
		: url.slice(0, query_start + 1) + normalized + url.slice(query_end);
}

/**
 * @param {ParentNode} root
 */
export function normalize_named_action_elements(root) {
	for (const form of root.querySelectorAll('form[action]')) {
		const action = form.getAttribute('action');
		if (!action) continue;

		const normalized = normalize_named_action_url(action);
		if (normalized !== action) {
			form.setAttribute('action', normalized);
		}
	}

	for (const element of root.querySelectorAll('button[formaction], input[formaction]')) {
		const action = element.getAttribute('formaction');
		if (!action) continue;

		const normalized = normalize_named_action_url(action);
		if (normalized !== action) {
			element.setAttribute('formaction', normalized);
		}
	}
}

/**
 * @param {string} tag
 */
function normalize_named_action_tag(tag) {
	if (/^<\s*\//.test(tag) || !/^<\s*(form|button|input)\b/i.test(tag)) {
		return tag;
	}

	return tag.replace(
		/(\s)(action|formaction)=(["'])(.*?)\3/gi,
		(match, space, name, quote, value) => {
			const normalized = normalize_named_action_url(value);
			return normalized === value ? match : `${space}${name}=${quote}${normalized}${quote}`;
		}
	);
}

/**
 * @param {string} html
 */
export function normalize_named_action_attributes(html) {
	let normalized = '';
	let index = 0;
	let raw_tag = '';
	const lower = html.toLowerCase();

	while (index < html.length) {
		if (raw_tag) {
			const closing = `</${raw_tag}`;
			const raw_end = lower.indexOf(closing, index);

			if (raw_end === -1) {
				return normalized + html.slice(index);
			}

			normalized += html.slice(index, raw_end);
			index = raw_end;
			raw_tag = '';
			continue;
		}

		const tag_start = html.indexOf('<', index);

		if (tag_start === -1) {
			return normalized + html.slice(index);
		}

		normalized += html.slice(index, tag_start);

		if (html.startsWith('<!--', tag_start)) {
			const comment_end = html.indexOf('-->', tag_start + 4);

			if (comment_end === -1) {
				return normalized + html.slice(tag_start);
			}

			normalized += html.slice(tag_start, comment_end + 3);
			index = comment_end + 3;
			continue;
		}

		let tag_end = -1;
		let quote = '';

		for (let i = tag_start + 1; i < html.length; i++) {
			const char = html[i];

			if (quote) {
				if (char === quote) quote = '';
				continue;
			}

			if (char === '"' || char === "'") {
				quote = char;
				continue;
			}

			if (char === '>') {
				tag_end = i;
				break;
			}
		}

		if (tag_end === -1) {
			return normalized + html.slice(tag_start);
		}

		const tag = html.slice(tag_start, tag_end + 1);
		normalized += normalize_named_action_tag(tag);

		const tag_name = /^<\s*([a-zA-Z][^\s/>]*)/.exec(tag)?.[1]?.toLowerCase();
		const self_closing = /\/\s*>$/.test(tag);
		if (
			(tag_name === 'script' ||
				tag_name === 'style' ||
				tag_name === 'textarea' ||
				tag_name === 'title') &&
			!self_closing
		) {
			raw_tag = tag_name;
		}

		index = tag_end + 1;
	}

	return normalized;
}

/** @param {string} path */
export function is_root_relative(path) {
	return path[0] === '/' && path[1] !== '/';
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
	 */
	const tracked_url_properties = ['href', 'pathname', 'search', 'toString', 'toJSON'];
	if (allow_hash) tracked_url_properties.push('hash');

	for (const property of tracked_url_properties) {
		Object.defineProperty(tracked, property, {
			get() {
				callback();
				// @ts-expect-error
				return url[property];
			},

			enumerable: true,
			configurable: true
		});
	}

	if (!BROWSER) {
		// @ts-ignore
		tracked[Symbol.for('nodejs.util.inspect.custom')] = (depth, opts, inspect) => {
			return inspect(url, opts);
		};

		// @ts-ignore
		tracked.searchParams[Symbol.for('nodejs.util.inspect.custom')] = (depth, opts, inspect) => {
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
		url[Symbol.for('nodejs.util.inspect.custom')] = (depth, opts, inspect) => {
			return inspect(new URL(url), opts);
		};
	}
}
