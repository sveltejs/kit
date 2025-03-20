import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import semver from 'semver';
import { posixify, mkdirp, rimraf, walk } from './filesystem.js';
import { resolve_aliases, write } from './utils.js';
import { emitDts } from 'svelte2tsx';
import { load_pkg_json } from './config.js';

/**
 * Generates d.ts files by invoking TypeScript's "emit d.ts files from input files".
 * The files are written to a temporary location and those which should be kept
 * are sanitized ($lib alias resolved) and copied over to the destination folder.
 *
 * @param {string} input
 * @param {string} output
 * @param {string} final_output
 * @param {string} cwd
 * @param {Record<string, string>} alias
 * @param {import('./types.js').File[]} files
 * @param {string | undefined} tsconfig
 */
export async function emit_dts(input, output, final_output, cwd, alias, files, tsconfig) {
	const tmp = `${output}/__package_types_tmp__`;
	rimraf(tmp);
	mkdirp(tmp);

	const require = createRequire(import.meta.url);
	const pkg = load_pkg_json(cwd);
	const svelte_dep = pkg.peerDependencies?.svelte || pkg.dependencies?.svelte || '3.0';
	const no_svelte_3 = !semver.intersects(svelte_dep, '^3.0.0');
	await emitDts({
		libRoot: input,
		svelteShimsPath: no_svelte_3
			? require.resolve('svelte2tsx/svelte-shims-v4.d.ts')
			: require.resolve('svelte2tsx/svelte-shims.d.ts'),
		declarationDir: path.relative(cwd, tmp),
		tsconfig
	});

	const handwritten = new Set();

	// skip files that conflict with hand-written .d.ts
	for (const file of files) {
		if (file.name.endsWith('.d.ts')) {
			handwritten.add(file.name);
		}
	}

	// resolve $lib alias (TODO others), copy into package dir
	for (const file of walk(tmp)) {
		const normalized = posixify(file);

		if (handwritten.has(normalized)) {
			console.warn(`Using $lib/${normalized} instead of generated .d.ts file`);
		}

		let source = fs.readFileSync(path.join(tmp, normalized), 'utf8');
		if (file.endsWith('.d.ts.map')) {
			// Because we put the .d.ts files in a temporary directory, the relative path needs to be adjusted
			const parsed = JSON.parse(source);
			if (parsed.sources) {
				parsed.sources = /** @type {string[]} */ (parsed.sources).map((source) =>
					posixify(
						path.join(
							path.relative(
								path.dirname(path.join(final_output, normalized)),
								path.dirname(path.join(input, normalized))
							),
							path.basename(source)
						)
					)
				);
				source = JSON.stringify(parsed);
			}
		} else {
			source = resolve_aliases(input, normalized, source, alias);
		}
		write(path.join(output, normalized), source);
	}

	rimraf(tmp);
}

/**
 * TS -> JS
 *
 * @param {string | undefined} tsconfig
 * @param {string} filename
 * @param {string} source
 */
export async function transpile_ts(tsconfig, filename, source) {
	const ts = await try_load_ts();
	const options = load_tsconfig(tsconfig, filename, ts);
	// transpileModule treats NodeNext as CommonJS because it doesn't read the package.json. Therefore we need to override it.
	// Also see https://github.com/microsoft/TypeScript/issues/53022 (the filename workaround doesn't work).
	return ts.transpileModule(source, {
		compilerOptions: {
			...options,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.NodeNext
		},
		fileName: filename
	}).outputText;
}

async function try_load_ts() {
	try {
		return (await import('typescript')).default;
	} catch {
		throw new Error(
			'You need to install TypeScript if you want to transpile TypeScript files and/or generate type definitions'
		);
	}
}

/**
 * @param {string | undefined} tsconfig
 * @param {string} filename
 * @param {import('typescript')} ts
 */
function load_tsconfig(tsconfig, filename, ts) {
	let config_filename;

	if (tsconfig) {
		if (fs.existsSync(tsconfig)) {
			config_filename = tsconfig;
		} else {
			throw new Error('Failed to locate provided tsconfig or jsconfig');
		}
	} else {
		// ts.findConfigFile is broken (it will favour a distant tsconfig
		// over a near jsconfig, and then only when you call it twice)
		// so we implement it ourselves
		let dir = filename;
		while (dir !== (dir = path.dirname(dir))) {
			const tsconfig = path.join(dir, 'tsconfig.json');
			const jsconfig = path.join(dir, 'jsconfig.json');

			if (fs.existsSync(tsconfig)) {
				config_filename = tsconfig;
				break;
			}

			if (fs.existsSync(jsconfig)) {
				config_filename = jsconfig;
				break;
			}
		}
	}

	if (!config_filename) {
		throw new Error('Failed to locate tsconfig or jsconfig');
	}

	const { error, config } = ts.readConfigFile(config_filename, ts.sys.readFile);

	if (error) {
		throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
	}

	// Do this so TS will not search for initial files which might take a while
	config.include = [];
	config.files = [];
	const { options } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		path.dirname(config_filename),
		{ sourceMap: false },
		config_filename
	);
	return options;
}
