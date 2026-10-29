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

/** @typedef {typeof valid_non_node_runtimes[number] | 'nodejs22.x' | 'nodejs24.x' | 'nodejs26.x' | ({} & `nodejs${number}.x`)} RuntimeKey */
