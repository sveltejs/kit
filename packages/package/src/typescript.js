import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { posixify, mkdirp, rimraf, walk } from './filesystem.js';
import { resolve_aliases, write } from './utils.js';
import { emitDts } from 'svelte2tsx';

/**
 * Generates d.ts files by invoking TypeScript's "emit d.ts files from input files".
 * The files are written to a temporary location and those which should be kept
 * are sanitized ($lib alias resolved) and copied over to the destination folder.
 *
 * @param {string} input
 * @param {string} output
 * @param {string} cwd
 * @param {Record<string, string>} alias
 * @param {import('./types').File[]} files
 */
export async function emit_dts(input, output, cwd, alias, files) {
	const tmp = `${output}/__package_types_tmp__`;
	rimraf(tmp);
	mkdirp(tmp);

	const require = createRequire(import.meta.url);
	await emitDts({
		libRoot: input,
		svelteShimsPath: require.resolve('svelte2tsx/svelte-shims.d.ts'),
		declarationDir: path.relative(cwd, tmp)
	});

	const handwritten = new Set();
	const excluded = new Set();

	// remove excluded files, and files that conflict with hand-written .d.ts
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

		// don't overwrite hand-written .d.ts files
		if (excluded.has(normalized)) continue;

		const source = fs.readFileSync(path.join(tmp, normalized), 'utf8');
		write(path.join(output, normalized), resolve_aliases(input, normalized, source, alias));
	}

	rimraf(tmp);
}

/**
 * TS -> JS
 *
 * @param {string} filename
 * @param {string} source
 */
export async function transpile_ts(filename, source) {
	const ts = await try_load_ts();
	return ts.transpileModule(source, {
		compilerOptions: load_tsconfig(filename, ts),
		fileName: filename
	}).outputText;
}

async function try_load_ts() {
	try {
		return (await import('typescript')).default;
	} catch (e) {
		throw new Error(
			'You need to install TypeScript if you want to transpile TypeScript files and/or generate type definitions'
		);
	}
}

/**
 * @param {string} filename
 * @param {import('typescript')} ts
 */
function load_tsconfig(filename, ts) {
	let config_filename;

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
