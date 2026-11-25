import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
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
				`Unsupported Node.js version: ${process.version}. Please use an up-to-date Node version to build your project, or explicitly specify a runtime in your adapter configuration.`
			);
		}

		return version_key;
	}

	throw new Error(
		'Could not auto-detect a runtime. Please explicitly specify a runtime in your adapter configuration.'
	);
}

const valid_non_node_runtimes = /** @type {const} */ (['bun1.x', 'bun1.4.x']);
// Node 20, 22, 24, and every major from 26
const valid_node_version_regex = /^nodejs(2[0246-9]|[3-9]\d)\.x$/;

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
			`Unsupported runtime: ${key}. Supported runtimes are: ${valid_non_node_runtimes.join(', ')}, and up-to-date Node versions. See the Node.js Version section in your Vercel project settings for info on the currently supported versions.`
		);
	}
}

// this is what to update when Vercel adds a new Node runtime or deprecates an old one! leave the rest of the code alone
/** @typedef {typeof valid_non_node_runtimes[number] | 'nodejs22.x' | 'nodejs24.x' | 'nodejs26.x' | ({} & `nodejs${number}.x`)} RuntimeKey */

const valid_deployment_id_regex = /^[a-zA-Z0-9_-]+$/;
const max_deployment_id_length = 32;

/**
 * Resolves the deployment ID to use for Vercel Skew Protection, if enabled.
 * On Vercel builds this uses `VERCEL_DEPLOYMENT_ID`; for prebuilt deployments
 * without `VERCEL_DEPLOYMENT_ID` it reuses SvelteKit's `version.name`.
 *
 * @param {string} version_name
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ id: string, custom: boolean } | undefined}
 */
export function resolve_deployment_id(version_name, env = process.env) {
	const enabled = env.VERCEL_SKEW_PROTECTION_ENABLED;
	if (!enabled || enabled === '0' || enabled.toLowerCase() === 'false') {
		return undefined;
	}

	if (env.VERCEL_DEPLOYMENT_ID) {
		return { id: env.VERCEL_DEPLOYMENT_ID, custom: false };
	}

	assert_is_valid_deployment_id(version_name);
	return { id: version_name, custom: true };
}

/**
 * @param {string} id
 */
function assert_is_valid_deployment_id(id) {
	if (typeof id !== 'string' || !id) {
		throw new Error(
			'Invalid deployment ID from SvelteKit `version.name` config: must be a non-empty string.'
		);
	}

	if (id.startsWith('dpl_')) {
		throw new Error(
			`Invalid deployment ID "${id}" from SvelteKit \`version.name\` config: must not start with "dpl_".`
		);
	}

	if (id.length > max_deployment_id_length) {
		throw new Error(
			`Invalid deployment ID "${id}" from SvelteKit \`version.name\` config: must be at most ${max_deployment_id_length} characters (got ${id.length}). If you use a commit hash, shorten it (e.g. \`git rev-parse --short HEAD\`).`
		);
	}

	if (!valid_deployment_id_regex.test(id)) {
		throw new Error(
			`Invalid deployment ID "${id}" from SvelteKit \`version.name\` config: must only contain alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), and underscores (_).`
		);
	}
}

/** Creates a checker whose package metadata cache lasts for a single function bundle. */
export function create_optional_peer_dependency_checker() {
	/** @type {Map<string, Set<string>>} */
	const cache = new Map();

	/** @param {string} dir */
	function optional_peers(dir) {
		const cached = cache.get(dir);
		if (cached) return cached;

		let peers = new Set();
		if (path.basename(dir) !== 'node_modules') {
			try {
				const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
				peers = new Set(
					Object.keys(pkg.peerDependencies ?? {}).filter(
						(name) => pkg.peerDependenciesMeta?.[name]?.optional === true
					)
				);
			} catch (error) {
				// Only continue past a missing manifest. Unreadable/invalid metadata must
				// not cause us to use the enclosing package's optional peers instead.
				const parent = path.dirname(dir);
				if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT' && parent !== dir) {
					peers = optional_peers(parent);
				}
			}
		}

		cache.set(dir, peers);
		return peers;
	}

	/**
	 * @param {string} specifier
	 * @param {string} importer
	 */
	return (specifier, importer) => {
		if (!path.isAbsolute(importer) || path.isAbsolute(specifier)) return false;
		const name = /^(@[^/]+\/[^/]+|[^./#][^/]*)(?:\/.*)?$/.exec(specifier)?.[1];
		if (!name) return false;

		try {
			const real_importer = fs.realpathSync(importer);
			if (!optional_peers(path.dirname(real_importer)).has(name)) return false;

			// A peer that is installed but fails to resolve (e.g. a broken subpath
			// or symlink) still warrants a warning. Only its absence is optional.
			const paths = createRequire(real_importer).resolve.paths(name) ?? [];
			return !paths.some((dir) => fs.lstatSync(path.join(dir, name), { throwIfNoEntry: false }));
		} catch {
			return false;
		}
	};
}
