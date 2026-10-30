import process from 'node:process';

/** @param {import("@sveltejs/kit").RouteDefinition<any>} route */
export function get_pathname(route) {
	let i = 1;

	const pathname = route.segments
		.map((segment) => {
			if (!segment.dynamic) {
				return '/' + segment.content;
			}

			const parts = segment.content.split(/\[(.+?)\](?!\])/);

			if (
				parts.length === 3 &&
				!parts[0] &&
				!parts[2] &&
				(parts[1].startsWith('...') || parts[1][0] === '[')
			) {
				// Special case: segment is a single optional or rest parameter.
				// In that case we don't prepend a slash (also see comment in pattern_to_src).
				return `$${i++}`;
			} else {
				return (
					'/' +
					parts
						.map((content, j) => {
							if (j % 2) {
								return `$${i++}`;
							} else {
								return content;
							}
						})
						.join('')
				);
			}
		})
		.join('');

	return pathname[0] === '/' ? pathname.slice(1) : pathname;
}

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

	// Move non-capturing groups that swallow slashes into their following capturing groups.
	// This is necessary because during ISR we're using the regex to construct the __pathname
	// query parameter: In case of a route like [required]/[...rest] we need to turn them
	// into $1$2 and not $1/$2, because if [...rest] is empty, we don't want to have a trailing
	// slash in the __pathname query parameter which wasn't there in the original URL, as that
	// could result in a false trailing slash redirect in the SvelteKit runtime, leading to infinite redirects.
	src = src.replace(/\(\?:\/\((.+?)\)\)/g, '(/$1)');

	return src;
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
	const key = (override_key ?? default_key ?? get_default_runtime()).replace('experimental_', '');
	assert_is_valid_runtime(key);
	return key;
}

const valid_node_version_regex = /^nodejs[2-9][02468]\.x$/;

/** @returns {RuntimeKey} */
function get_default_runtime() {
	// TODO may someday need to auto-detect Bun, but this will be complicated because you may want to run your build
	// with Bun but not have your serverless runtime be in Bun. Vercel will likely have to attach something to `globalThis` or similar
	// to tell us what the bun configuration is.
	const major = Number(process.version.slice(1).split('.')[0]);
	const version_key = /** @type {const} */ (`nodejs${major}.x`);

	if (!valid_node_version_regex.test(version_key)) {
		throw new Error(
			`Unsupported Node.js version: ${process.version}. Please use an even Node version to build your project, or explicitly specify a runtime in your adapter configuration.`
		);
	}

	return version_key;
}

const valid_non_node_runtimes = /** @type {const} */ (['bun1.x', 'edge']);

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

/** @typedef {Exclude<RuntimeKey, 'bun1.x'> | 'experimental_bun1.x'} RuntimeConfigKey */
// this is what to update when Vercel adds a new Node runtime or deprecates an old one! leave the rest of the code alone
/** @typedef {typeof valid_non_node_runtimes[number] | 'nodejs20.x' | 'nodejs22.x' | 'nodejs24.x' | 'nodejs26.x' | ({} & `nodejs${number}.x`)} RuntimeKey */
