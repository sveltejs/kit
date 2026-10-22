import process from 'node:process';

/**
 * Adjusts the stringified route regex for Vercel's routing system
 * @param {string} pattern stringified route regex
 */
export function pattern_to_src(pattern) {
	let src = pattern
		// remove leading / and trailing $/
		.slice(1, -2)
		// replace escaped \/ with /
		.replace(/\\\//g, '/');

	// replace the root route "^/" with "^/?"
	if (src === '^/') {
		src = '^/?';
	}

	return src;
}

/**
 * Escapes a pathname so that it can be matched literally by a Vercel route `src` regex
 * @param {string} pathname
 */
export function escape_src(pathname) {
	// hex escapes rather than backslash escapes, since Vercel only appends the `$` anchor
	// if `src` doesn't already end with `$`, and it replaces `\/` with `/`
	return pathname.replace(
		/[.*+?^${}()|[\]\\]/g,
		(char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`
	);
}

/** @param {string} str */
export function escape_regex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Vercel rejects routes whose `src` is longer than 4096 characters
const MAX_SRC_LENGTH = 4000;

/**
 * Creates routes that redirect prerendered pages to their canonical trailing slash form.
 * Since Vercel limits the number of routes in a deployment, pathnames are combined into
 * as few routes as possible rather than creating one route per page.
 * This function is duplicated in adapter-static
 * @param {string[]} pathnames decoded pathnames without leading or trailing slashes
 * @param {boolean} trailing_slash `true` if the redirect should add a trailing slash, `false` if it should remove it
 */
export function trailing_slash_redirects(pathnames, trailing_slash) {
	/** @type {Array<{ src: string, headers: { Location: string }, status: number, caseSensitive: boolean }>} */
	const routes = [];

	/** @type {string[]} */
	let alternatives = [];
	let length = 0;

	const flush = () => {
		if (alternatives.length === 0) return;

		const group = alternatives.join('|');

		routes.push({
			src: trailing_slash ? `^/(${group})$` : `^/(${group})/$`,
			headers: { Location: trailing_slash ? '/$1/' : '/$1' },
			status: 308,
			caseSensitive: true
		});

		alternatives = [];
		length = 0;
	};

	for (const pathname of pathnames) {
		// Vercel matches against the encoded pathname, so we encode it the same way Kit does when prerendering
		const alternative = escape_regex(encodeURI(pathname));

		if (length + alternative.length + 1 > MAX_SRC_LENGTH) flush();

		alternatives.push(alternative);
		length += alternative.length + 1;
	}

	flush();

	return routes;
}

/**
 * Returns the `trailingSlash` option if every route uses the same one, allowing
 * trailing slashes to be normalized with a single route rather than one per page.
 * Returns `undefined` if the routes disagree, if they use `'ignore'`,
 * or if the version of SvelteKit doesn't expose the option to adapters.
 * This function is duplicated in adapter-static
 * @param {Array<{ trailingSlash?: 'never' | 'always' | 'ignore' }>} routes
 * @returns {'never' | 'always' | undefined}
 */
export function get_uniform_trailing_slash(routes) {
	const values = new Set(routes.map((route) => route.trailingSlash));
	if (values.size !== 1) return;

	const [value] = values;
	if (value === 'never' || value === 'always') return value;
}

const integer = /^\d+$/;

/**
 * @param {false | string | number} value
 * @param {string} route_id
 * @returns {number | false}
 */
export function parse_isr_expiration(value, route_id) {
	if (value === false || value === 'false') return false; // 1 year

	/** @param {string} desc */
	const err = (desc) => {
		throw new Error(
			`Invalid isr.expiration value: ${JSON.stringify(value)} (${desc}, in ${route_id})`
		);
	};

	let parsed;
	if (typeof value === 'string') {
		if (!integer.test(value)) {
			err('value was a string but could not be parsed as an integer');
		}
		parsed = Number.parseInt(value, 10);
	} else {
		if (!Number.isInteger(value)) {
			err('should be an integer');
		}
		parsed = value;
	}

	if (Number.isNaN(parsed)) {
		err('should be a number');
	}
	if (parsed < 0) {
		err('should be non-negative');
	}
	return parsed;
}

/**
 * @param {string | undefined} default_key
 * @param {string | undefined} [override_key]
 * @returns {RuntimeKey}
 */
export function resolve_runtime(default_key, override_key) {
	const key = override_key ?? default_key ?? get_default_runtime();
	assert_is_valid_runtime(key);
	return key;
}

const valid_bun_versions = /** @type {const} */ (['1.x', '1.4.x']);

/** @returns {RuntimeKey} */
function get_default_runtime() {
	// if the user ran e.g. `bunx --bun vite build`, infer that they want to run the app in Bun
	if (process.versions.bun) {
		const [major, minor] = process.versions.bun.split('.');
		if (major !== '1') {
			throw new Error(
				`Unsupported Bun version: ${major}. Please use Bun 1.x to build your project, or explicitly specify a runtime in your adapter configuration.`
			);
		}

		// pin the minor when Vercel can resolve it specifically (e.g. `bun1.4.x`),
		// otherwise fall back to `bun1.x` so a newer Bun still builds
		const version = minor ? `${major}.${minor}.x` : `${major}.x`;
		return /** @type {`bun${typeof valid_bun_versions[number]}`} */ (
			`bun${valid_bun_versions.includes(/** @type {typeof valid_bun_versions[number]} */ (version)) ? version : `${major}.x`}`
		);
	}

	// otherwise, default to the version of Node specified in the project config
	if (process.versions.node) {
		const major = Number(process.versions.node.split('.')[0]);
		const version_key = /** @type {const} */ (`nodejs${major}.x`);

		if (!valid_node_version_regex.test(version_key)) {
			throw new Error(
				`Unsupported Node.js version: ${process.version}. Please use an even Node version to build your project, or explicitly specify a runtime in your adapter configuration.`
			);
		}

		return version_key;
	}

	throw new Error(
		'Could not auto-detect a runtime. Please explicitly specify a runtime in your adapter configuration.'
	);
}

const valid_non_node_runtimes = /** @type {const} */ (['bun1.x', 'bun1.4.x']);
const valid_node_version_regex = /^nodejs[2-9][02468]\.x$/;

/**
 * @param {string} key
 * @returns {asserts key is RuntimeKey}
 */
function assert_is_valid_runtime(key) {
	if (
		!valid_non_node_runtimes.includes(
			/** @type {typeof valid_non_node_runtimes[number]} */ (key)
		) &&
		!valid_node_version_regex.test(key)
	) {
		throw new Error(
			`Unsupported runtime: ${key}. Supported runtimes are: ${valid_non_node_runtimes.join(', ')}, and even Node versions. See the Node.js Version section in your Vercel project settings for info on the currently supported versions.`
		);
	}
}

// this is what to update when Vercel adds a new Node runtime or deprecates an old one! leave the rest of the code alone
/** @typedef {typeof valid_non_node_runtimes[number] | 'nodejs22.x' | 'nodejs24.x' | 'nodejs26.x' | ({} & `nodejs${number}.x`)} RuntimeKey */
