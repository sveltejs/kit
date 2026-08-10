/** @import ts from 'typescript' */
import path from 'node:path';
import { ESSENTIAL_OPTIONS, remove_trailing_slashstar } from './utils.js';
import { posixify } from '../../../utils/os.js';

const formatter = new Intl.ListFormat('en-gb', { type: 'conjunction' });

/**
 * @param {string[]} things
 */
function join(things) {
	return formatter.format(things.map((thing) => JSON.stringify(thing)));
}

/**
 * @param {string} dir
 * @param {ts.ParsedCommandLine} resolved
 * @param {Record<string, string[]>} paths
 * @param {string[]} types
 * @param {string[]} [exclusions]
 */
export function validate_resolved_config(dir, resolved, paths, types, exclusions) {
	/** @type {string[]} */
	const warnings = [];

	if (resolved.options.types) {
		validate_types(warnings, types, resolved.options.types);
	}

	if (resolved.options.paths) {
		validate_paths(
			warnings,
			/** @type {string} */ (resolved.options.pathsBasePath),
			paths,
			resolved.options.paths
		);
	}

	if (exclusions) {
		validate_exclusions(warnings, dir, exclusions, resolved.fileNames);
	}

	for (const key in ESSENTIAL_OPTIONS) {
		if (resolved.options[key] !== ESSENTIAL_OPTIONS[key]) {
			warnings.push(
				`"${key}" was overwritten. It should be ${JSON.stringify(ESSENTIAL_OPTIONS[key])}`
			);
		}
	}

	return warnings;
}

/**
 * @param {string[]} warnings
 * @param {string[]} expected
 * @param {string[]} actual
 */
export function validate_types(warnings, expected, actual) {
	const missing_types = expected.filter((/** @type {string} */ type) => !actual.includes(type));

	if (missing_types.length > 0) {
		warnings.push(`"types" was overwritten. It must include ${join(missing_types)}`);
	}

	return warnings;
}

/**
 * @param {string[]} warnings
 * @param {string} base
 * @param {Record<string, string[]>} expected
 * @param {ts.MapLike<string[]>} actual
 */
export function validate_paths(warnings, base, expected, actual) {
	/** @type {Set<string>} */
	const mismatch = new Set();

	for (const [k, e] of Object.entries(expected)) {
		const a = actual[k]?.map((/** @type {string} */ x) =>
			path.resolve(/** @type {string} */ (base), x)
		);

		if (JSON.stringify(e) !== JSON.stringify(a)) {
			mismatch.add(remove_trailing_slashstar(k));
		}
	}

	if (mismatch.size > 0) {
		const joined = join([...mismatch]);

		warnings.push(`"paths" was overwritten. Imports from ${joined} may not typecheck`);
	}

	return warnings;
}

/**
 * @param {string[]} warnings
 * @param {string} dir
 * @param {string[]} exclusions
 * @param {string[]} files
 */
export function validate_exclusions(warnings, dir, exclusions, files) {
	const missing_exclusions = exclusions.map(posixify).filter((exclusion) => {
		return files.some(
			(f) => f === exclusion || f.startsWith(exclusion + '/') || f.startsWith(exclusion + '.')
		);
	});

	if (missing_exclusions.length > 0) {
		warnings.push(
			`${join(missing_exclusions.map((file) => posixify(path.relative(dir, file))))} should be added to the "exclude" array`
		);
	}

	return warnings;
}

/**
 * Validates that a tsconfig contains `"extends": "<id>"`
 * @param {any} options
 * @param {string} id
 */
export function extends_id(options, id) {
	const o = options.extends;
	return Array.isArray(o) ? o.includes(id) : o === id;
}
