/**
 * @param {Record<string, string | string[]>} headers
 * @param {string} key
 * @returns {string | undefined}
 * @throws {Error}
 */
function get_single_valued_header(headers, key) {
	const value = headers[key];
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return undefined;
		}
		if (value.length > 1) {
			throw new Error(
				`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`
			);
		}
		return value[0];
	}
	return value;
}

/** @param {Record<string, any>} obj */
function lowercase_keys(obj) {
	/** @type {Record<string, any>} */
	const clone = {};

	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}

	return clone;
}

/** @param {Record<string, string>} params */
function decode_params(params) {
	for (const key in params) {
		// input has already been decoded by decodeURI
		// now handle the rest that decodeURIComponent would do
		params[key] = params[key]
			.replace(/%23/g, '#')
			.replace(/%3[Bb]/g, ';')
			.replace(/%2[Cc]/g, ',')
			.replace(/%2[Ff]/g, '/')
			.replace(/%3[Ff]/g, '?')
			.replace(/%3[Aa]/g, ':')
			.replace(/%40/g, '@')
			.replace(/%26/g, '&')
			.replace(/%3[Dd]/g, '=')
			.replace(/%2[Bb]/g, '+')
			.replace(/%24/g, '$');
	}

	return params;
}

/** @param {string} body */
function error(body) {
	return {
		status: 500,
		body,
		headers: {}
	};
}

/** @param {unknown} s */
function is_string(s) {
	return typeof s === 'string' || s instanceof String;
}

/**
 * Decides how the body should be parsed based on its mime type. Should match what's in parse_body
 *
 * @param {string | undefined | null} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
function is_content_type_textual(content_type) {
	if (!content_type) return true; // defaults to json
	const [type] = content_type.split(';'); // get the mime type
	return (
		type === 'text/plain' ||
		type === 'application/json' ||
		type === 'application/x-www-form-urlencoded' ||
		type === 'multipart/form-data'
	);
}

/**
 * @param {import('types/hooks').ServerRequest} request
 * @param {import('types/internal').SSREndpoint} route
 * @param {RegExpExecArray} match
 * @returns {Promise<import('types/hooks').ServerResponse | undefined>}
 */
async function render_endpoint(request, route, match) {
	const mod = await route.load();

	/** @type {import('types/endpoint').RequestHandler} */
	const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

	if (!handler) {
		return;
	}

	// we're mutating `request` so that we don't have to do { ...request, params }
	// on the next line, since that breaks the getters that replace path, query and
	// origin. We could revert that once we remove the getters
	request.params = route.params ? decode_params(route.params(match)) : {};

	const response = await handler(request);
	const preface = `Invalid response from route ${request.url.pathname}`;

	if (!response) {
		return;
	}
	if (typeof response !== 'object') {
		return error(`${preface}: expected an object, got ${typeof response}`);
	}

	let { status = 200, body, headers = {} } = response;

	headers = lowercase_keys(headers);
	const type = get_single_valued_header(headers, 'content-type');

	const is_type_textual = is_content_type_textual(type);

	if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
		return error(
			`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`
		);
	}

	/** @type {import('types/hooks').StrictBody} */
	let normalized_body;

	// ensure the body is an object
	if (
		(typeof body === 'object' || typeof body === 'undefined') &&
		!(body instanceof Uint8Array) &&
		(!type || type.startsWith('application/json'))
	) {
		headers = { ...headers, 'content-type': 'application/json; charset=utf-8' };
		normalized_body = JSON.stringify(typeof body === 'undefined' ? {} : body);
	} else {
		normalized_body = /** @type {import('types/hooks').StrictBody} */ (body);
	}

	return { status, body: normalized_body, headers };
}

var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped = {
    '<': '\\u003C',
    '>': '\\u003E',
    '/': '\\u002F',
    '\\': '\\\\',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\0': '\\0',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join('\0');
function devalue(value) {
    var counts = new Map();
    function walk(thing) {
        if (typeof thing === 'function') {
            throw new Error("Cannot stringify a function");
        }
        if (counts.has(thing)) {
            counts.set(thing, counts.get(thing) + 1);
            return;
        }
        counts.set(thing, 1);
        if (!isPrimitive(thing)) {
            var type = getType(thing);
            switch (type) {
                case 'Number':
                case 'String':
                case 'Boolean':
                case 'Date':
                case 'RegExp':
                    return;
                case 'Array':
                    thing.forEach(walk);
                    break;
                case 'Set':
                case 'Map':
                    Array.from(thing).forEach(walk);
                    break;
                default:
                    var proto = Object.getPrototypeOf(thing);
                    if (proto !== Object.prototype &&
                        proto !== null &&
                        Object.getOwnPropertyNames(proto).sort().join('\0') !== objectProtoOwnPropertyNames) {
                        throw new Error("Cannot stringify arbitrary non-POJOs");
                    }
                    if (Object.getOwnPropertySymbols(thing).length > 0) {
                        throw new Error("Cannot stringify POJOs with symbolic keys");
                    }
                    Object.keys(thing).forEach(function (key) { return walk(thing[key]); });
            }
        }
    }
    walk(value);
    var names = new Map();
    Array.from(counts)
        .filter(function (entry) { return entry[1] > 1; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .forEach(function (entry, i) {
        names.set(entry[0], getName(i));
    });
    function stringify(thing) {
        if (names.has(thing)) {
            return names.get(thing);
        }
        if (isPrimitive(thing)) {
            return stringifyPrimitive(thing);
        }
        var type = getType(thing);
        switch (type) {
            case 'Number':
            case 'String':
            case 'Boolean':
                return "Object(" + stringify(thing.valueOf()) + ")";
            case 'RegExp':
                return "new RegExp(" + stringifyString(thing.source) + ", \"" + thing.flags + "\")";
            case 'Date':
                return "new Date(" + thing.getTime() + ")";
            case 'Array':
                var members = thing.map(function (v, i) { return i in thing ? stringify(v) : ''; });
                var tail = thing.length === 0 || (thing.length - 1 in thing) ? '' : ',';
                return "[" + members.join(',') + tail + "]";
            case 'Set':
            case 'Map':
                return "new " + type + "([" + Array.from(thing).map(stringify).join(',') + "])";
            default:
                var obj = "{" + Object.keys(thing).map(function (key) { return safeKey(key) + ":" + stringify(thing[key]); }).join(',') + "}";
                var proto = Object.getPrototypeOf(thing);
                if (proto === null) {
                    return Object.keys(thing).length > 0
                        ? "Object.assign(Object.create(null)," + obj + ")"
                        : "Object.create(null)";
                }
                return obj;
        }
    }
    var str = stringify(value);
    if (names.size) {
        var params_1 = [];
        var statements_1 = [];
        var values_1 = [];
        names.forEach(function (name, thing) {
            params_1.push(name);
            if (isPrimitive(thing)) {
                values_1.push(stringifyPrimitive(thing));
                return;
            }
            var type = getType(thing);
            switch (type) {
                case 'Number':
                case 'String':
                case 'Boolean':
                    values_1.push("Object(" + stringify(thing.valueOf()) + ")");
                    break;
                case 'RegExp':
                    values_1.push(thing.toString());
                    break;
                case 'Date':
                    values_1.push("new Date(" + thing.getTime() + ")");
                    break;
                case 'Array':
                    values_1.push("Array(" + thing.length + ")");
                    thing.forEach(function (v, i) {
                        statements_1.push(name + "[" + i + "]=" + stringify(v));
                    });
                    break;
                case 'Set':
                    values_1.push("new Set");
                    statements_1.push(name + "." + Array.from(thing).map(function (v) { return "add(" + stringify(v) + ")"; }).join('.'));
                    break;
                case 'Map':
                    values_1.push("new Map");
                    statements_1.push(name + "." + Array.from(thing).map(function (_a) {
                        var k = _a[0], v = _a[1];
                        return "set(" + stringify(k) + ", " + stringify(v) + ")";
                    }).join('.'));
                    break;
                default:
                    values_1.push(Object.getPrototypeOf(thing) === null ? 'Object.create(null)' : '{}');
                    Object.keys(thing).forEach(function (key) {
                        statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
                    });
            }
        });
        statements_1.push("return " + str);
        return "(function(" + params_1.join(',') + "){" + statements_1.join(';') + "}(" + values_1.join(',') + "))";
    }
    else {
        return str;
    }
}
function getName(num) {
    var name = '';
    do {
        name = chars[num % chars.length] + name;
        num = ~~(num / chars.length) - 1;
    } while (num >= 0);
    return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
    return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
    if (typeof thing === 'string')
        return stringifyString(thing);
    if (thing === void 0)
        return 'void 0';
    if (thing === 0 && 1 / thing < 0)
        return '-0';
    var str = String(thing);
    if (typeof thing === 'number')
        return str.replace(/^(-)?0\./, '$1.');
    return str;
}
function getType(thing) {
    return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
    return escaped[c] || c;
}
function escapeUnsafeChars(str) {
    return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
    return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
    return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
    var result = '"';
    for (var i = 0; i < str.length; i += 1) {
        var char = str.charAt(i);
        var code = char.charCodeAt(0);
        if (char === '"') {
            result += '\\"';
        }
        else if (char in escaped) {
            result += escaped[char];
        }
        else if (code >= 0xd800 && code <= 0xdfff) {
            var next = str.charCodeAt(i + 1);
            // If this is the beginning of a [high, low] surrogate pair,
            // add the next two characters, otherwise escape
            if (code <= 0xdbff && (next >= 0xdc00 && next <= 0xdfff)) {
                result += char + str[++i];
            }
            else {
                result += "\\u" + code.toString(16).toUpperCase();
            }
        }
        else {
            result += char;
        }
    }
    result += '"';
    return result;
}

function noop() { }
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
Promise.resolve();

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = new Set();
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (const subscriber of subscribers) {
                    subscriber[1]();
                    subscriber_queue.push(subscriber, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

/**
 * @param {unknown} err
 * @return {Error}
 */
function coalesce_to_error(err) {
	return err instanceof Error ||
		(err && /** @type {any} */ (err).name && /** @type {any} */ (err).message)
		? /** @type {Error} */ (err)
		: new Error(JSON.stringify(err));
}

/**
 * Hash using djb2
 * @param {import('types/hooks').StrictBody} value
 */
function hash(value) {
	let hash = 5381;
	let i = value.length;

	if (typeof value === 'string') {
		while (i) hash = (hash * 33) ^ value.charCodeAt(--i);
	} else {
		while (i) hash = (hash * 33) ^ value[--i];
	}

	return (hash >>> 0).toString(36);
}

/** @type {Record<string, string>} */
const escape_json_string_in_html_dict = {
	'"': '\\"',
	'<': '\\u003C',
	'>': '\\u003E',
	'/': '\\u002F',
	'\\': '\\\\',
	'\b': '\\b',
	'\f': '\\f',
	'\n': '\\n',
	'\r': '\\r',
	'\t': '\\t',
	'\0': '\\0',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

/** @param {string} str */
function escape_json_string_in_html(str) {
	return escape(
		str,
		escape_json_string_in_html_dict,
		(code) => `\\u${code.toString(16).toUpperCase()}`
	);
}

/** @type {Record<string, string>} */
const escape_html_attr_dict = {
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;'
};

/**
 * use for escaping string values to be used html attributes on the page
 * e.g.
 * <script data-url="here">
 *
 * @param {string} str
 * @returns string escaped string
 */
function escape_html_attr(str) {
	return '"' + escape(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}

/**
 *
 * @param str {string} string to escape
 * @param dict {Record<string, string>} dictionary of character replacements
 * @param unicode_encoder {function(number): string} encoder to use for high unicode characters
 * @returns {string}
 */
function escape(str, dict, unicode_encoder) {
	let result = '';

	for (let i = 0; i < str.length; i += 1) {
		const char = str.charAt(i);
		const code = char.charCodeAt(0);

		if (char in dict) {
			result += dict[char];
		} else if (code >= 0xd800 && code <= 0xdfff) {
			const next = str.charCodeAt(i + 1);

			// If this is the beginning of a [high, low] surrogate pair,
			// add the next two characters, otherwise escape
			if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
				result += char + str[++i];
			} else {
				result += unicode_encoder(code);
			}
		} else {
			result += char;
		}
	}

	return result;
}

const s = JSON.stringify;

// TODO rename this function/module

/**
 * @param {{
 *   branch: Array<import('./types').Loaded>;
 *   options: import('types/internal').SSRRenderOptions;
 *   $session: any;
 *   page_config: { hydrate: boolean, router: boolean, ssr: boolean };
 *   status: number;
 *   error?: Error,
 *   url: URL;
 *   params: Record<string, string>
 * }} opts
 */
async function render_response({
	branch,
	options,
	$session,
	page_config,
	status,
	error,
	url,
	params
}) {
	const css = new Set(options.manifest._.entry.css);
	const js = new Set(options.manifest._.entry.js);
	const styles = new Set();

	/** @type {Array<{ url: string, body: string, json: string }>} */
	const serialized_data = [];

	let rendered;

	let is_private = false;
	let maxage;

	if (error) {
		error.stack = options.get_stack(error);
	}

	if (page_config.ssr) {
		branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
			if (node.css) node.css.forEach((url) => css.add(url));
			if (node.js) node.js.forEach((url) => js.add(url));
			if (node.styles) node.styles.forEach((content) => styles.add(content));

			// TODO probably better if `fetched` wasn't populated unless `hydrate`
			if (fetched && page_config.hydrate) serialized_data.push(...fetched);

			if (uses_credentials) is_private = true;

			maxage = loaded.maxage;
		});

		const session = writable($session);

		/** @type {Record<string, any>} */
		const props = {
			stores: {
				page: writable(null),
				navigating: writable(null),
				session
			},
			page: { url, params },
			components: branch.map(({ node }) => node.module.default)
		};

		if (options.dev) {
			// TODO remove this for 1.0
			/**
			 * @param {string} property
			 * @param {string} replacement
			 */
			const print_error = (property, replacement) => {
				Object.defineProperty(props.page, property, {
					get: () => {
						throw new Error(`$page.${property} has been replaced by $page.url.${replacement}`);
					}
				});
			};

			print_error('origin', 'origin');
			print_error('path', 'pathname');
			print_error('query', 'searchParams');
		}

		// props_n (instead of props[n]) makes it easy to avoid
		// unnecessary updates for layout components
		for (let i = 0; i < branch.length; i += 1) {
			props[`props_${i}`] = await branch[i].loaded.props;
		}

		let session_tracking_active = false;
		const unsubscribe = session.subscribe(() => {
			if (session_tracking_active) is_private = true;
		});
		session_tracking_active = true;

		try {
			rendered = options.root.render(props);
		} finally {
			unsubscribe();
		}
	} else {
		rendered = { head: '', html: '', css: { code: '', map: null } };
	}

	const include_js = page_config.router || page_config.hydrate;
	if (!include_js) js.clear();

	// TODO strip the AMP stuff out of the build if not relevant
	const links = options.amp
		? styles.size > 0 || rendered.css.code.length > 0
			? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join('\n')}</style>`
			: ''
		: [
				// From https://web.dev/priority-hints/:
				// Generally, preloads will load in the order the parser gets to them for anything above "Medium" priority
				// Thus, we should list CSS first
				...Array.from(css).map((dep) => `<link rel="stylesheet" href="${options.prefix}${dep}">`),
				...Array.from(js).map((dep) => `<link rel="modulepreload" href="${options.prefix}${dep}">`)
		  ].join('\n\t\t');

	/** @type {string} */
	let init = '';

	if (options.amp) {
		init = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"></script>`;
		init += options.service_worker
			? '<script async custom-element="amp-install-serviceworker" src="https://cdn.ampproject.org/v0/amp-install-serviceworker-0.1.js"></script>'
			: '';
	} else if (include_js) {
		// prettier-ignore
		init = `<script type="module">
			import { start } from ${s(options.prefix + options.manifest._.entry.file)};
			start({
				target: ${options.target ? `document.querySelector(${s(options.target)})` : 'document.body'},
				paths: ${s(options.paths)},
				session: ${try_serialize($session, (error) => {
					throw new Error(`Failed to serialize session data: ${error.message}`);
				})},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s(options.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error)},
					nodes: [
						${(branch || [])
						.map(({ node }) => `import(${s(options.prefix + node.entry)})`)
						.join(',\n\t\t\t\t\t\t')}
					],
					url: new URL(${s(url.href)}),
					params: ${devalue(params)}
				}` : 'null'}
			});
		</script>`;
	}

	if (options.service_worker && !options.amp) {
		init += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options.service_worker}');
			}
		</script>`;
	}

	const head = [
		rendered.head,
		styles.size && !options.amp
			? `<style data-svelte>${Array.from(styles).join('\n')}</style>`
			: '',
		links,
		init
	].join('\n\n\t\t');

	let body = rendered.html;
	if (options.amp) {
		if (options.service_worker) {
			body += `<amp-install-serviceworker src="${options.service_worker}" layout="nodisplay"></amp-install-serviceworker>`;
		}
	} else {
		body += serialized_data
			.map(({ url, body, json }) => {
				let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(
					url
				)}`;
				if (body) attributes += ` data-body="${hash(body)}"`;

				return `<script ${attributes}>${json}</script>`;
			})
			.join('\n\n\t');
	}

	/** @type {import('types/helper').ResponseHeaders} */
	const headers = {
		'content-type': 'text/html'
	};

	if (maxage) {
		headers['cache-control'] = `${is_private ? 'private' : 'public'}, max-age=${maxage}`;
	}

	if (!options.floc) {
		headers['permissions-policy'] = 'interest-cohort=()';
	}

	return {
		status,
		headers,
		body: options.template({ head, body })
	};
}

/**
 * @param {any} data
 * @param {(error: Error) => void} [fail]
 */
function try_serialize(data, fail) {
	try {
		return devalue(data);
	} catch (err) {
		if (fail) fail(coalesce_to_error(err));
		return null;
	}
}

// Ensure we return something truthy so the client will not re-render the page over the error

/** @param {(Error & {frame?: string} & {loc?: object}) | undefined | null} error */
function serialize_error(error) {
	if (!error) return null;
	let serialized = try_serialize(error);
	if (!serialized) {
		const { name, message, stack } = error;
		serialized = try_serialize({ ...error, name, message, stack });
	}
	if (!serialized) {
		serialized = '{}';
	}
	return serialized;
}

/**
 * @param {import('types/page').LoadOutput} loaded
 * @returns {import('types/internal').NormalizedLoadOutput}
 */
function normalize(loaded) {
	const has_error_status =
		loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
	if (loaded.error || has_error_status) {
		const status = loaded.status;

		if (!loaded.error && has_error_status) {
			return {
				status: status || 500,
				error: new Error()
			};
		}

		const error = typeof loaded.error === 'string' ? new Error(loaded.error) : loaded.error;

		if (!(error instanceof Error)) {
			return {
				status: 500,
				error: new Error(
					`"error" property returned from load() must be a string or instance of Error, received type "${typeof error}"`
				)
			};
		}

		if (!status || status < 400 || status > 599) {
			console.warn('"error" returned from load() without a valid status code — defaulting to 500');
			return { status: 500, error };
		}

		return { status, error };
	}

	if (loaded.redirect) {
		if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
			return {
				status: 500,
				error: new Error(
					'"redirect" property returned from load() must be accompanied by a 3xx status code'
				)
			};
		}

		if (typeof loaded.redirect !== 'string') {
			return {
				status: 500,
				error: new Error('"redirect" property returned from load() must be a string')
			};
		}
	}

	// TODO remove before 1.0
	if (/** @type {any} */ (loaded).context) {
		throw new Error(
			'You are returning "context" from a load function. ' +
				'"context" was renamed to "stuff", please adjust your code accordingly.'
		);
	}

	return /** @type {import('types/internal').NormalizedLoadOutput} */ (loaded);
}

const absolute = /^([a-z]+:)?\/?\//;
const scheme = /^[a-z]+:/;

/**
 * @param {string} base
 * @param {string} path
 */
function resolve(base, path) {
	if (scheme.test(path)) return path;

	const base_match = absolute.exec(base);
	const path_match = absolute.exec(path);

	if (!base_match) {
		throw new Error(`bad base path: "${base}"`);
	}

	const baseparts = path_match ? [] : base.slice(base_match[0].length).split('/');
	const pathparts = path_match ? path.slice(path_match[0].length).split('/') : path.split('/');

	baseparts.pop();

	for (let i = 0; i < pathparts.length; i += 1) {
		const part = pathparts[i];
		if (part === '.') continue;
		else if (part === '..') baseparts.pop();
		else baseparts.push(part);
	}

	const prefix = (path_match && path_match[0]) || (base_match && base_match[0]) || '';

	return `${prefix}${baseparts.join('/')}`;
}

/** @param {string} path */
function is_root_relative(path) {
	return path[0] === '/' && path[1] !== '/';
}

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   options: import('types/internal').SSRRenderOptions;
 *   state: import('types/internal').SSRRenderState;
 *   route: import('types/internal').SSRPage | null;
 *   url: URL;
 *   params: Record<string, string>;
 *   node: import('types/internal').SSRNode;
 *   $session: any;
 *   stuff: Record<string, any>;
 *   prerender_enabled: boolean;
 *   is_leaf: boolean;
 *   is_error: boolean;
 *   status?: number;
 *   error?: Error;
 * }} opts
 * @returns {Promise<import('./types').Loaded | undefined>} undefined for fallthrough
 */
async function load_node({
	request,
	options,
	state,
	route,
	url,
	params,
	node,
	$session,
	stuff,
	prerender_enabled,
	is_leaf,
	is_error,
	status,
	error
}) {
	const { module } = node;

	let uses_credentials = false;

	/**
	 * @type {Array<{
	 *   url: string;
	 *   body: string;
	 *   json: string;
	 * }>}
	 */
	const fetched = [];

	/**
	 * @type {string[]}
	 */
	let set_cookie_headers = [];

	let loaded;

	const url_proxy = new Proxy(url, {
		get: (target, prop, receiver) => {
			if (prerender_enabled && (prop === 'search' || prop === 'searchParams')) {
				throw new Error('Cannot access query on a page with prerendering enabled');
			}
			return Reflect.get(target, prop, receiver);
		}
	});

	if (module.load) {
		/** @type {import('types/page').LoadInput | import('types/page').ErrorLoadInput} */
		const load_input = {
			url: url_proxy,
			params,
			get session() {
				uses_credentials = true;
				return $session;
			},
			/**
			 * @param {RequestInfo} resource
			 * @param {RequestInit} opts
			 */
			fetch: async (resource, opts = {}) => {
				/** @type {string} */
				let requested;

				if (typeof resource === 'string') {
					requested = resource;
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

				const resolved = resolve(request.url.pathname, requested.split('?')[0]);

				let response;

				// handle fetch requests for static assets. e.g. prebaked data, etc.
				// we need to support everything the browser's fetch supports
				const prefix = options.paths.assets || options.paths.base;
				const filename = (
					resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved
				).slice(1);
				const filename_html = `${filename}/index.html`; // path may also match path/index.html

				const is_asset = options.manifest.assets.has(filename);
				const is_asset_html = options.manifest.assets.has(filename_html);

				if (is_asset || is_asset_html) {
					const file = is_asset ? filename : filename_html;

					if (options.read) {
						const type = is_asset
							? options.manifest._.mime[filename.slice(filename.lastIndexOf('.'))]
							: 'text/html';

						response = new Response(options.read(file), {
							headers: type ? { 'content-type': type } : {}
						});
					} else {
						response = await fetch(`${url.origin}/${file}`, /** @type {RequestInit} */ (opts));
					}
				} else if (is_root_relative(resolved)) {
					const relative = resolved;

					// TODO: fix type https://github.com/node-fetch/node-fetch/issues/1113
					if (opts.credentials !== 'omit') {
						uses_credentials = true;

						if (request.headers.cookie) {
							opts.headers.set('cookie', request.headers.cookie);
						}

						if (request.headers.authorization && !opts.headers.has('authorization')) {
							opts.headers.set('authorization', request.headers.authorization);
						}
					}

					if (opts.body && typeof opts.body !== 'string') {
						// per https://developer.mozilla.org/en-US/docs/Web/API/Request/Request, this can be a
						// Blob, BufferSource, FormData, URLSearchParams, USVString, or ReadableStream object.
						// non-string bodies are irksome to deal with, but luckily aren't particularly useful
						// in this context anyway, so we take the easy route and ban them
						throw new Error('Request body must be a string');
					}

					const rendered = await respond(
						{
							url: new URL(requested, request.url),
							method: opts.method || 'GET',
							headers: Object.fromEntries(opts.headers),
							rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body)
						},
						options,
						{
							fetched: requested,
							initiator: route
						}
					);

					if (rendered) {
						if (state.prerender) {
							state.prerender.dependencies.set(relative, rendered);
						}

						// Set-Cookie must be filtered out (done below) and that's the only header value that
						// can be an array so we know we have only simple values
						// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
						response = new Response(rendered.body, {
							status: rendered.status,
							headers: /** @type {Record<string, string>} */ (rendered.headers)
						});
					} else {
						// we can't load the endpoint from our own manifest,
						// so we need to make an actual HTTP request
						return fetch(new URL(requested, request.url).href, {
							method: opts.method || 'GET',
							headers: opts.headers
						});
					}
				} else {
					// external
					if (resolved.startsWith('//')) {
						throw new Error(
							`Cannot request protocol-relative URL (${requested}) in server-side fetch`
						);
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
						`.${new URL(requested).hostname}`.endsWith(`.${request.url.hostname}`) &&
						opts.credentials !== 'omit'
					) {
						uses_credentials = true;
						opts.headers.set('cookie', request.headers.cookie);
					}

					const external_request = new Request(requested, /** @type {RequestInit} */ (opts));
					response = await options.hooks.externalFetch.call(null, external_request);
				}

				if (response) {
					const proxy = new Proxy(response, {
						get(response, key, _receiver) {
							async function text() {
								const body = await response.text();

								/** @type {import('types/helper').ResponseHeaders} */
								const headers = {};
								for (const [key, value] of response.headers) {
									if (key === 'set-cookie') {
										set_cookie_headers = set_cookie_headers.concat(value);
									} else if (key !== 'etag') {
										headers[key] = value;
									}
								}

								if (!opts.body || typeof opts.body === 'string') {
									// prettier-ignore
									fetched.push({
										url: requested,
										body: /** @type {string} */ (opts.body),
										json: `{"status":${response.status},"statusText":${s(response.statusText)},"headers":${s(headers)},"body":"${escape_json_string_in_html(body)}"}`
									});
								}

								return body;
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
				}

				return (
					response ||
					new Response('Not found', {
						status: 404
					})
				);
			},
			stuff: { ...stuff }
		};

		if (options.dev) {
			// TODO remove this for 1.0
			Object.defineProperty(load_input, 'page', {
				get: () => {
					throw new Error('`page` in `load` functions has been replaced by `url` and `params`');
				}
			});
		}

		if (is_error) {
			/** @type {import('types/page').ErrorLoadInput} */ (load_input).status = status;
			/** @type {import('types/page').ErrorLoadInput} */ (load_input).error = error;
		}

		loaded = await module.load.call(null, load_input);
	} else {
		loaded = {};
	}

	// if leaf node (i.e. page component) has a load function
	// that returns nothing, we fall through to the next one
	if (!loaded && is_leaf && !is_error) return;

	if (!loaded) {
		throw new Error(`${node.entry} - load must return a value except for page fall through`);
	}

	return {
		node,
		loaded: normalize(loaded),
		stuff: loaded.stuff || stuff,
		fetched,
		set_cookie_headers,
		uses_credentials
	};
}

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types/internal').SSRNode} SSRNode
 * @typedef {import('types/internal').SSRRenderOptions} SSRRenderOptions
 * @typedef {import('types/internal').SSRRenderState} SSRRenderState
 */

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   options: SSRRenderOptions;
 *   state: SSRRenderState;
 *   $session: any;
 *   status: number;
 *   error: Error;
 * }} opts
 */
async function respond_with_error({ request, options, state, $session, status, error }) {
	const default_layout = await options.manifest._.nodes[0](); // 0 is always the root layout
	const default_error = await options.manifest._.nodes[1](); // 1 is always the root error

	/** @type {Record<string, string>} */
	const params = {}; // error page has no params

	// error pages don't fall through, so we know it's not undefined
	const loaded = /** @type {Loaded} */ (
		await load_node({
			request,
			options,
			state,
			route: null,
			url: request.url, // TODO this is redundant, no?
			params,
			node: default_layout,
			$session,
			stuff: {},
			prerender_enabled: is_prerender_enabled(options, default_error, state),
			is_leaf: false,
			is_error: false
		})
	);

	const branch = [
		loaded,
		/** @type {Loaded} */ (
			await load_node({
				request,
				options,
				state,
				route: null,
				url: request.url,
				params,
				node: default_error,
				$session,
				stuff: loaded ? loaded.stuff : {},
				prerender_enabled: is_prerender_enabled(options, default_error, state),
				is_leaf: false,
				is_error: true,
				status,
				error
			})
		)
	];

	try {
		return await render_response({
			options,
			$session,
			page_config: {
				hydrate: options.hydrate,
				router: options.router,
				ssr: options.ssr
			},
			status,
			error,
			branch,
			url: request.url,
			params
		});
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return {
			status: 500,
			headers: {},
			body: error.stack
		};
	}
}

/**
 * @param {SSRRenderOptions} options
 * @param {SSRNode} node
 * @param {SSRRenderState} state
 */
function is_prerender_enabled(options, node, state) {
	return (
		options.prerender && (!!node.module.prerender || (!!state.prerender && state.prerender.all))
	);
}

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types/hooks').ServerResponse} ServerResponse
 * @typedef {import('types/internal').SSRNode} SSRNode
 * @typedef {import('types/internal').SSRRenderOptions} SSRRenderOptions
 * @typedef {import('types/internal').SSRRenderState} SSRRenderState
 */

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   options: SSRRenderOptions;
 *   state: SSRRenderState;
 *   $session: any;
 *   route: import('types/internal').SSRPage;
 *   params: Record<string, string>;
 * }} opts
 * @returns {Promise<ServerResponse | undefined>}
 */
async function respond$1(opts) {
	const { request, options, state, $session, route } = opts;

	/** @type {Array<SSRNode | undefined>} */
	let nodes;

	try {
		nodes = await Promise.all(
			route.a.map((n) => options.manifest._.nodes[n] && options.manifest._.nodes[n]())
		);
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return await respond_with_error({
			request,
			options,
			state,
			$session,
			status: 500,
			error
		});
	}

	// the leaf node will be present. only layouts may be undefined
	const leaf = /** @type {SSRNode} */ (nodes[nodes.length - 1]).module;

	let page_config = get_page_config(leaf, options);

	if (!leaf.prerender && state.prerender && !state.prerender.all) {
		// if the page has `export const prerender = true`, continue,
		// otherwise bail out at this point
		return {
			status: 204,
			headers: {}
		};
	}

	/** @type {Array<Loaded>} */
	let branch = [];

	/** @type {number} */
	let status = 200;

	/** @type {Error|undefined} */
	let error;

	/** @type {string[]} */
	let set_cookie_headers = [];

	ssr: if (page_config.ssr) {
		let stuff = {};

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			/** @type {Loaded | undefined} */
			let loaded;

			if (node) {
				try {
					loaded = await load_node({
						...opts,
						url: request.url,
						node,
						stuff,
						prerender_enabled: is_prerender_enabled(options, node, state),
						is_leaf: i === nodes.length - 1,
						is_error: false
					});

					if (!loaded) return;

					set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);

					if (loaded.loaded.redirect) {
						return with_cookies(
							{
								status: loaded.loaded.status,
								headers: {
									location: encodeURI(loaded.loaded.redirect)
								}
							},
							set_cookie_headers
						);
					}

					if (loaded.loaded.error) {
						({ status, error } = loaded.loaded);
					}
				} catch (err) {
					const e = coalesce_to_error(err);

					options.handle_error(e, request);

					status = 500;
					error = e;
				}

				if (loaded && !error) {
					branch.push(loaded);
				}

				if (error) {
					while (i--) {
						if (route.b[i]) {
							const error_node = await options.manifest._.nodes[route.b[i]]();

							/** @type {Loaded} */
							let node_loaded;
							let j = i;
							while (!(node_loaded = branch[j])) {
								j -= 1;
							}

							try {
								// there's no fallthough on an error page, so we know it's not undefined
								const error_loaded = /** @type {import('./types').Loaded} */ (
									await load_node({
										...opts,
										url: request.url,
										node: error_node,
										stuff: node_loaded.stuff,
										prerender_enabled: is_prerender_enabled(options, error_node, state),
										is_leaf: false,
										is_error: true,
										status,
										error
									})
								);

								if (error_loaded.loaded.error) {
									continue;
								}

								page_config = get_page_config(error_node.module, options);
								branch = branch.slice(0, j + 1).concat(error_loaded);
								break ssr;
							} catch (err) {
								const e = coalesce_to_error(err);

								options.handle_error(e, request);

								continue;
							}
						}
					}

					// TODO backtrack until we find an __error.svelte component
					// that we can use as the leaf node
					// for now just return regular error page
					return with_cookies(
						await respond_with_error({
							request,
							options,
							state,
							$session,
							status,
							error
						}),
						set_cookie_headers
					);
				}
			}

			if (loaded && loaded.loaded.stuff) {
				stuff = {
					...stuff,
					...loaded.loaded.stuff
				};
			}
		}
	}

	try {
		return with_cookies(
			await render_response({
				...opts,
				url: request.url,
				page_config,
				status,
				error,
				branch: branch.filter(Boolean)
			}),
			set_cookie_headers
		);
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return with_cookies(
			await respond_with_error({
				...opts,
				status: 500,
				error
			}),
			set_cookie_headers
		);
	}
}

/**
 * @param {import('types/internal').SSRComponent} leaf
 * @param {SSRRenderOptions} options
 */
function get_page_config(leaf, options) {
	return {
		ssr: 'ssr' in leaf ? !!leaf.ssr : options.ssr,
		router: 'router' in leaf ? !!leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? !!leaf.hydrate : options.hydrate
	};
}

/**
 * @param {ServerResponse} response
 * @param {string[]} set_cookie_headers
 */
function with_cookies(response, set_cookie_headers) {
	if (set_cookie_headers.length) {
		response.headers['set-cookie'] = set_cookie_headers;
	}
	return response;
}

/**
 * @param {import('types/hooks').ServerRequest} request
 * @param {import('types/internal').SSRPage} route
 * @param {RegExpExecArray} match
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} state
 * @returns {Promise<import('types/hooks').ServerResponse | undefined>}
 */
async function render_page(request, route, match, options, state) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return {
			status: 404,
			headers: {},
			body: `Not found: ${request.url.pathname}`
		};
	}

	const params = route.params ? decode_params(route.params(match)) : {};

	const $session = await options.hooks.getSession(request);

	const response = await respond$1({
		request,
		options,
		state,
		$session,
		route,
		params
	});

	if (response) {
		return response;
	}

	if (state.fetched) {
		// we came here because of a bad request in a `load` function.
		// rather than render the error page — which could lead to an
		// infinite loop, if the `load` belonged to the root layout,
		// we respond with a bare-bones 500
		return {
			status: 500,
			headers: {},
			body: `Bad request in load function: failed to fetch ${state.fetched}`
		};
	}
}

function read_only_form_data() {
	/** @type {Map<string, string[]>} */
	const map = new Map();

	return {
		/**
		 * @param {string} key
		 * @param {string} value
		 */
		append(key, value) {
			if (map.has(key)) {
				(map.get(key) || []).push(value);
			} else {
				map.set(key, [value]);
			}
		},

		data: new ReadOnlyFormData(map)
	};
}

class ReadOnlyFormData {
	/** @type {Map<string, string[]>} */
	#map;

	/** @param {Map<string, string[]>} map */
	constructor(map) {
		this.#map = map;
	}

	/** @param {string} key */
	get(key) {
		const value = this.#map.get(key);
		return value && value[0];
	}

	/** @param {string} key */
	getAll(key) {
		return this.#map.get(key);
	}

	/** @param {string} key */
	has(key) {
		return this.#map.has(key);
	}

	*[Symbol.iterator]() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield [key, value[i]];
			}
		}
	}

	*entries() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield [key, value[i]];
			}
		}
	}

	*keys() {
		for (const [key] of this.#map) yield key;
	}

	*values() {
		for (const [, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield value[i];
			}
		}
	}
}

/**
 * @param {import('types/app').RawBody} raw
 * @param {import('types/helper').RequestHeaders} headers
 */
function parse_body(raw, headers) {
	if (!raw) return raw;

	const content_type = headers['content-type'];
	const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];

	const text = () => new TextDecoder(headers['content-encoding'] || 'utf-8').decode(raw);

	switch (type) {
		case 'text/plain':
			return text();

		case 'application/json':
			return JSON.parse(text());

		case 'application/x-www-form-urlencoded':
			return get_urlencoded(text());

		case 'multipart/form-data': {
			const boundary = directives.find((directive) => directive.startsWith('boundary='));
			if (!boundary) throw new Error('Missing boundary');
			return get_multipart(text(), boundary.slice('boundary='.length));
		}
		default:
			return raw;
	}
}

/** @param {string} text */
function get_urlencoded(text) {
	const { data, append } = read_only_form_data();

	text
		.replace(/\+/g, ' ')
		.split('&')
		.forEach((str) => {
			const [key, value] = str.split('=');
			append(decodeURIComponent(key), decodeURIComponent(value));
		});

	return data;
}

/**
 * @param {string} text
 * @param {string} boundary
 */
function get_multipart(text, boundary) {
	const parts = text.split(`--${boundary}`);

	if (parts[0] !== '' || parts[parts.length - 1].trim() !== '--') {
		throw new Error('Malformed form data');
	}

	const { data, append } = read_only_form_data();

	parts.slice(1, -1).forEach((part) => {
		const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
		if (!match) {
			throw new Error('Malformed form data');
		}
		const raw_headers = match[1];
		const body = match[2].trim();

		let key;

		/** @type {Record<string, string>} */
		const headers = {};
		raw_headers.split('\r\n').forEach((str) => {
			const [raw_header, ...raw_directives] = str.split('; ');
			let [name, value] = raw_header.split(': ');

			name = name.toLowerCase();
			headers[name] = value;

			/** @type {Record<string, string>} */
			const directives = {};
			raw_directives.forEach((raw_directive) => {
				const [name, value] = raw_directive.split('=');
				directives[name] = JSON.parse(value); // TODO is this right?
			});

			if (name === 'content-disposition') {
				if (value !== 'form-data') throw new Error('Malformed form data');

				if (directives.filename) {
					// TODO we probably don't want to do this automatically
					throw new Error('File upload is not yet implemented');
				}

				if (directives.name) {
					key = directives.name;
				}
			}
		});

		if (!key) throw new Error('Malformed form data');

		append(key, body);
	});

	return data;
}

/** @type {import('@sveltejs/kit/ssr').Respond} */
async function respond(incoming, options, state = {}) {
	if (incoming.url.pathname !== '/' && options.trailing_slash !== 'ignore') {
		const has_trailing_slash = incoming.url.pathname.endsWith('/');

		if (
			(has_trailing_slash && options.trailing_slash === 'never') ||
			(!has_trailing_slash &&
				options.trailing_slash === 'always' &&
				!(incoming.url.pathname.split('/').pop() || '').includes('.'))
		) {
			incoming.url.pathname = has_trailing_slash
				? incoming.url.pathname.slice(0, -1)
				: incoming.url.pathname + '/';

			if (incoming.url.search === '?') incoming.url.search = '';

			return {
				status: 301,
				headers: {
					location: incoming.url.pathname + incoming.url.search
				}
			};
		}
	}

	const headers = lowercase_keys(incoming.headers);
	const request = {
		...incoming,
		headers,
		body: parse_body(incoming.rawBody, headers),
		params: {},
		locals: {}
	};

	if (options.dev) {
		// TODO remove this for 1.0
		/**
		 * @param {string} property
		 * @param {string} replacement
		 */
		const print_error = (property, replacement) => {
			Object.defineProperty(request, property, {
				get: () => {
					throw new Error(`request.${property} has been replaced by request.url.${replacement}`);
				}
			});
		};

		print_error('origin', 'origin');
		print_error('path', 'pathname');
		print_error('query', 'searchParams');
	}

	try {
		return await options.hooks.handle({
			request,
			resolve: async (request) => {
				if (state.prerender && state.prerender.fallback) {
					return await render_response({
						url: request.url,
						params: request.params,
						options,
						$session: await options.hooks.getSession(request),
						page_config: { ssr: false, router: true, hydrate: true },
						status: 200,
						branch: []
					});
				}

				const decoded = decodeURI(request.url.pathname).replace(options.paths.base, '');

				for (const route of options.manifest._.routes) {
					const match = route.pattern.exec(decoded);
					if (!match) continue;

					const response =
						route.type === 'endpoint'
							? await render_endpoint(request, route, match)
							: await render_page(request, route, match, options, state);

					if (response) {
						// inject ETags for 200 responses
						if (response.status === 200) {
							const cache_control = get_single_valued_header(response.headers, 'cache-control');
							if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
								let if_none_match_value = request.headers['if-none-match'];
								// ignore W/ prefix https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match#directives
								if (if_none_match_value?.startsWith('W/"')) {
									if_none_match_value = if_none_match_value.substring(2);
								}

								const etag = `"${hash(response.body || '')}"`;

								if (if_none_match_value === etag) {
									return {
										status: 304,
										headers: {}
									};
								}

								response.headers['etag'] = etag;
							}
						}

						return response;
					}
				}

				// if this request came direct from the user, rather than
				// via a `fetch` in a `load`, render a 404 page
				if (!state.initiator) {
					const $session = await options.hooks.getSession(request);
					return await respond_with_error({
						request,
						options,
						state,
						$session,
						status: 404,
						error: new Error(`Not found: ${request.url.pathname}`)
					});
				}
			}
		});
	} catch (/** @type {unknown} */ err) {
		const e = coalesce_to_error(err);

		options.handle_error(e, request);

		return {
			status: 500,
			headers: {},
			body: options.dev ? e.stack : e.message
		};
	}
}

export { respond };
