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
	let no_svelte_3;
	try {
		no_svelte_3 = !semver.intersects(svelte_dep, '^3.0.0');
	} catch {
		// Not all version specs are valid semver, e.g. "latest" or "next" or catalog references
		no_svelte_3 = true;
	}
	const svelte_shims_path = no_svelte_3
		? require.resolve('svelte2tsx/svelte-shims-v4.d.ts')
		: require.resolve('svelte2tsx/svelte-shims.d.ts');
	const package_tsconfig = await create_package_tsconfig(input, cwd, files, tsconfig);

	try {
		await emitDts({
			libRoot: input,
			svelteShimsPath: svelte_shims_path,
			declarationDir: path.relative(cwd, tmp),
			tsconfig: package_tsconfig ?? tsconfig
		});
	} finally {
		if (package_tsconfig) {
			fs.rmSync(package_tsconfig, { force: true });
		}
	}

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
 * @param {string} input
 * @param {string} cwd
 * @param {import('./types.js').File[]} files
 * @param {string | undefined} tsconfig
 */
async function create_package_tsconfig(input, cwd, files, tsconfig) {
	const app_types = path.join(cwd, 'node_modules/$app/types/index.d.ts');

	if (!fs.existsSync(app_types) || !uses_app_server(input, files)) {
		return;
	}

	const ts = await try_load_ts();
	const config_filename = find_config_file(input, tsconfig, ts);

	if (!config_filename) {
		return;
	}

	const { error, config } = ts.readConfigFile(config_filename, ts.sys.readFile);

	if (error) {
		return;
	}

	const { options } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		path.dirname(config_filename),
		{ sourceMap: false },
		config_filename
	);
	const types = Array.from(new Set([...(options.types ?? []), '$app/types']));
	const relative_config = posixify(path.relative(cwd, config_filename));
	const package_tsconfig = path.join(
		cwd,
		`.svelte-package-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
	);

	write(
		package_tsconfig,
		JSON.stringify(
			{
				extends: relative_config.startsWith('.') ? relative_config : `./${relative_config}`,
				compilerOptions: { types }
			},
			null,
			'\t'
		)
	);

	return package_tsconfig;
}

/**
 * @param {string} input
 * @param {import('./types.js').File[]} files
 */
function uses_app_server(input, files) {
	return files.some((file) => {
		if (!file.is_svelte && !/\.[cm]?[jt]s$/.test(file.name)) {
			return false;
		}

		return fs.readFileSync(path.join(input, file.name), 'utf8').includes('$app/server');
	});
}

/**
 * @param {string} input
 * @param {string | undefined} tsconfig
 * @param {import('typescript')} ts
 */
function find_config_file(input, tsconfig, ts) {
	if (tsconfig) {
		return fs.existsSync(tsconfig) ? tsconfig : undefined;
	}

	const jsconfig_file = ts.findConfigFile(input, ts.sys.fileExists, 'jsconfig.json');
	const tsconfig_file = ts.findConfigFile(input, ts.sys.fileExists, 'tsconfig.json');

	if (!tsconfig_file) {
		return jsconfig_file;
	}

	if (jsconfig_file && is_subpath(path.dirname(tsconfig_file), path.dirname(jsconfig_file))) {
		return jsconfig_file;
	}

	return tsconfig_file;
}

/**
 * Returns true when `child` is nested inside `parent`.
 *
 * @param {string} parent
 * @param {string} child
 */
function is_subpath(parent, child) {
	const relative = path.relative(parent, child);
	return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * TS -> JS
 *
 * @param {string | undefined} tsconfig
 * @param {string} filename
 * @param {string} source
 * @param {Map<string, import('typescript').CompilerOptions>} cache
 */
export async function transpile_ts(tsconfig, filename, source, cache) {
	const ts = await try_load_ts();
	const options = await load_tsconfig(tsconfig, filename, cache, ts);
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
 * @param {Map<string, import('typescript').CompilerOptions>} cache
 * @param {import('typescript')} [ts]
 */
export async function load_tsconfig(tsconfig, filename, cache, ts) {
	if (!ts) {
		ts = await try_load_ts();
	}

	let config_filename;
	/** @type {string[]} */
	const traversed_dirs = [];

	if (tsconfig) {
		if (fs.existsSync(tsconfig)) {
			config_filename = tsconfig;

			const cached = cache.get(config_filename);
			if (cached) {
				return cached;
			} else {
				// This isn't really a dir, but it simplifies the caching logic
				traversed_dirs.push(config_filename);
			}
		} else {
			throw new Error('Failed to locate provided tsconfig or jsconfig');
		}
	} else {
		// ts.findConfigFile is broken (it will favour a distant tsconfig
		// over a near jsconfig, and then only when you call it twice)
		// so we implement it ourselves
		let dir = filename;
		while (dir !== (dir = path.dirname(dir))) {
			const cached = cache.get(dir);
			if (cached) {
				for (const traversed of traversed_dirs) {
					cache.set(traversed, cached);
				}
				return cached;
			}

			traversed_dirs.push(dir);

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

	for (const dir of traversed_dirs) {
		cache.set(dir, options);
	}

	return options;
}
