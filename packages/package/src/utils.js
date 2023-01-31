import * as fs from 'fs';
import * as path from 'path';
import { posixify, mkdirp, walk } from './filesystem.js';

/**
 * Resolves the `$lib` alias.
 *
 * TODO: make this more generic to also handle other aliases the user could have defined via
 * `kit.alias`. Also investigate how to do this in a more robust way (right now regex string
 * replacement is used).
 * For more discussion see https://github.com/sveltejs/kit/pull/2453
 *
 * @param {string} file Relative to the lib root
 * @param {string} content
 * @param {import('./types').ValidatedConfig} config
 * @returns {string}
 */
export function resolve_lib_alias(file, content, config) {
	const aliases = { $lib: path.resolve(config.package.source), ...(config.kit?.alias ?? {}) };

	/**
	 * @param {string} match
	 * @param {string} _
	 * @param {string} import_path
	 */
	const replace_import_path = (match, _, import_path) => {
		for (const [alias, value] of Object.entries(aliases)) {
			if (!import_path.startsWith(alias)) continue;

			const full_path = path.join(config.package.source, file);
			const full_import_path = path.join(value, import_path.slice(alias.length));
			let resolved = posixify(path.relative(path.dirname(full_path), full_import_path));
			resolved = resolved.startsWith('.') ? resolved : './' + resolved;
			return match.replace(import_path, resolved);
		}
		return match;
	};

	content = content.replace(/from\s+('|")([^"';,]+?)\1/g, replace_import_path);
	content = content.replace(/import\s*\(\s*('|")([^"';,]+?)\1\s*\)/g, replace_import_path);
	return content;
}

/**
 * Strip out lang="X" or type="text/X" tags. Doing it here is only a temporary solution.
 * See https://github.com/sveltejs/kit/issues/2450 for ideas for places where it's handled better.
 *
 * @param {string} content
 */
export function strip_lang_tags(content) {
	return content
		.replace(
			/(<!--[^]*?-->)|(<script[^>]*?)\s(?:type|lang)=(["'])(.*?)\3/g,
			// things like application/ld+json should be kept as-is. Preprocessed languages are "ts" etc
			(match, s1, s2, _, s4) => (s4?.startsWith('application/') ? match : (s1 ?? '') + (s2 ?? ''))
		)
		.replace(/(<!--[^]*?-->)|(<style[^>]*?)\s(?:type|lang)=(["']).*?\3/g, '$1$2');
}

/**
 * @param {string} file
 * @param {Parameters<typeof fs.writeFileSync>[1]} contents
 */
export function write(file, contents) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}

/** @type {Map<string, string>} */
let current = new Map();
/**
 * @param {string} file
 * @param {string} contents
 */
export function write_if_changed(file, contents) {
	if (current.get(file) !== contents) {
		write(file, contents);
		current.set(file, contents);
		return true;
	}
	return false;
}

/**
 * @param {import('./types').ValidatedConfig} config
 * @returns {import('./types').File[]}
 */
export function scan(config) {
	return walk(config.package.source).map((file) => analyze(config, file));
}

/**
 * @param {import('./types').ValidatedConfig} config
 * @param {string} file
 * @returns {import('./types').File}
 */
export function analyze(config, file) {
	const name = posixify(file);

	const svelte_extension = config.extensions.find((ext) => name.endsWith(ext));

	const base = svelte_extension ? name : name.slice(0, -path.extname(name).length);

	const dest = svelte_extension
		? name.slice(0, -svelte_extension.length) + '.svelte'
		: name.endsWith('.d.ts')
		? name
		: name.endsWith('.ts')
		? name.slice(0, -3) + '.js'
		: name;

	return {
		name,
		dest,
		base,
		is_included: config.package.files(name),
		is_exported: config.package.exports(name),
		is_svelte: !!svelte_extension
	};
}

/**
 * @param {string} cwd
 * @param {NonNullable<import('types').PackageConfig['packageJson']>} packageJson
 * @param {import('./types').File[]} files
 */
export function generate_pkg(cwd, packageJson, files) {
	const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
	const original = JSON.parse(JSON.stringify(pkg));

	// Remove fields that are specific to the original package.json
	// See: https://pnpm.io/package_json#publishconfigdirectory
	delete pkg.publishConfig?.directory;
	delete pkg.linkDirectory?.directory;
	delete pkg.scripts;

	pkg.type = 'module';

	pkg.exports = {
		'./package.json': './package.json',
		...pkg.exports
	};

	/** @type {Record<string, string>} */
	const clashes = {};

	for (const file of files) {
		if (file.is_included && file.is_exported) {
			const original = `$lib/${file.name}`;
			const entry = `./${file.dest}`;
			const key = entry.replace(/\/index\.js$|(\/[^/]+)\.js$/, '$1');

			if (clashes[key]) {
				throw new Error(
					`Duplicate "${key}" export. Please remove or rename either ${clashes[key]} or ${original}`
				);
			}

			if (!pkg.exports[key]) {
				pkg.exports[key] = entry;
			}

			clashes[key] = original;
		}
	}

	if (!pkg.dependencies?.svelte && !pkg.peerDependencies?.svelte) {
		console.warn(
			'Svelte libraries should include "svelte" in either "dependencies" or "peerDependencies".'
		);
	}

	if (!pkg.svelte && files.some((file) => file.is_svelte)) {
		// Several heuristics in Kit/vite-plugin-svelte to tell Vite to mark Svelte packages
		// rely on the "svelte" property. Vite/Rollup/Webpack plugin can all deal with it.
		// See https://github.com/sveltejs/kit/issues/1959 for more info and related threads.
		if (pkg.exports['.']) {
			const svelte_export =
				typeof pkg.exports['.'] === 'string'
					? pkg.exports['.']
					: pkg.exports['.'].svelte || pkg.exports['.'].import || pkg.exports['.'].default;
			if (svelte_export) {
				pkg.svelte = svelte_export;
			} else {
				console.warn(
					'Cannot generate a "svelte" entry point because the "." entry in "exports" is not a string. If you set it by hand, please also set one of the options as a "svelte" entry point in your package.json\n' +
						'Example: { ..., "svelte": "./index.svelte" } }\n'
				);
			}
		} else {
			console.warn(
				'Cannot generate a "svelte" entry point because the "." entry in "exports" is missing. Please specify one or set a "svelte" entry point yourself in your package.json\n' +
					'Example: { ..., "svelte": "./index.svelte" } }\n'
			);
		}
	}

	const final = packageJson(original, pkg);
	return { pkg: packageJson(original, pkg), pkg_name: final?.name ?? original.name };
}
