import fs from 'node:fs';
import path from 'node:path';
import colors from 'kleur';
import { guess_indent, posixify, walk } from '../../utils.js';

/**
 * @param {any} config
 */
export function migrate_pkg(config) {
	const files = scan(config);
	const pkg_str = fs.readFileSync('package.json', 'utf8');
	const pkg = update_pkg_json(config, JSON.parse(pkg_str), files);
	fs.writeFileSync('package.json', JSON.stringify(pkg, null, guess_indent(pkg_str) ?? '\t'));
}

/**
 * @param {any} config
 */
function scan(config) {
	return walk(config.package.source).map((file) => analyze(config, file));
}

/**
 * @param {any} config
 * @param {string} file
 */
function analyze(config, file) {
	const name = posixify(file);

	const svelte_extension = config.extensions.find((/** @type {string} */ ext) =>
		name.endsWith(ext)
	);

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
		is_included: config.package.files(name),
		is_exported: config.package.exports(name),
		is_svelte: !!svelte_extension
	};
}

/**
 * @param {any} config
 * @param {any} pkg
 * @param {ReturnType<typeof analyze>[]} files
 */
export function update_pkg_json(config, pkg, files) {
	const out_dir = path.relative('.', config.package.dir);

	// See: https://pnpm.io/package_json#publishconfigdirectory
	if (pkg.publishConfig?.directory || pkg.linkDirectory?.directory) {
		console.log(
			colors.yellow(
				`Detected "publishConfig.directory" or "linkDirectory.directory" fields in your package.json. ` +
					`This migration removes them, which may or may not be what you want. Please review closely.`
			)
		);
		delete pkg.publishConfig?.directory;
		delete pkg.linkDirectory?.directory;
	}

	for (const key in pkg.scripts || []) {
		const script = pkg.scripts[key];
		if (script.includes('svelte-package')) {
			pkg.scripts[key] = script.replace('svelte-package', `svelte-package -o ${out_dir}`);
		}
	}

	pkg.type = 'module';
	pkg.exports = {
		'./package.json': './package.json',
		...pkg.exports
	};

	pkg.files = pkg.files || [];
	if (!pkg.files.includes(out_dir)) {
		pkg.files.push(out_dir);
	}

	/** @type {Record<string, string>} */
	const clashes = {};

	for (const file of files) {
		if (file.is_included && file.is_exported) {
			const original = `$lib/${file.name}`;
			const key = `./${file.dest}`.replace(/\/index\.js$|(\/[^/]+)\.js$/, '$1');

			if (clashes[key]) {
				console.log(
					colors.yellow(
						`Duplicate "${key}" export. Closely review your "exports" field in package.json after the migration.`
					)
				);
			}

			if (!pkg.exports[key]) {
				const has_type = config.package.emitTypes && (file.is_svelte || file.dest.endsWith('.js'));
				const needs_svelte_condition = file.is_svelte || path.basename(file.dest) === 'index.js';
				// JSON.stringify will remove the undefined entries
				pkg.exports[key] = {
					types: has_type
						? `./${out_dir}/${
								file.is_svelte ? `${file.dest}.d.ts` : file.dest.slice(0, -'.js'.length) + '.d.ts'
						  }`
						: undefined,
					svelte: needs_svelte_condition ? `./${out_dir}/${file.dest}` : undefined,
					default: `./${out_dir}/${file.dest}`
				};

				if (Object.values(pkg.exports[key]).filter(Boolean).length === 1) {
					pkg.exports[key] = pkg.exports[key].default;
				}
			}

			clashes[key] = original;
		}
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
				console.log(
					colors.yellow(
						'Cannot generate a "svelte" entry point because the "." entry in "exports" is not a string. Please specify a "svelte" entry point yourself\n'
					)
				);
			}
		} else {
			console.log(
				colors.yellow(
					'Cannot generate a "svelte" entry point because the "." entry in "exports" is missing. Please specify a "svelte" entry point yourself\n'
				)
			);
		}
	}

	return pkg;
}
