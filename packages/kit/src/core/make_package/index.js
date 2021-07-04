import * as fs from 'fs';
import globrex from 'globrex';
import * as path from 'path';
import { preprocess } from 'svelte/compiler';
import { mkdirp, rimraf } from '../filesystem/index.js';

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {string} cwd
 */
export async function make_package(config, cwd = process.cwd()) {
	rimraf(path.join(cwd, config.kit.package.dir));

	// Generate type definitions first so hand-written types can overwrite generated ones
	await emit_dts(config);

	const files_filter = create_filter(config.kit.package.files);
	const exports_filter = create_filter({
		...config.kit.package.exports,
		exclude: [...config.kit.package.exports.exclude, '*.d.ts']
	});

	const files = walk(config.kit.files.lib);

	const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));

	const package_pkg = {
		name: pkg.name,
		version: pkg.version,
		description: pkg.description,
		keywords: pkg.keywords,
		homepage: pkg.homepage,
		bugs: pkg.bugs,
		license: pkg.license,
		author: pkg.author,
		contributors: pkg.contributors,
		funding: pkg.funding,
		repository: pkg.repository,
		dependencies: pkg.dependencies,
		private: pkg.private,
		publishConfig: pkg.publishConfig,
		type: 'module',
		/** @type {Record<string, string>} */
		exports: {
			'./package.json': './package.json'
		}
	};

	for (const file of files) {
		if (!files_filter(file)) continue;

		const filename = path.join(config.kit.files.lib, file);
		const source = fs.readFileSync(filename, 'utf8');

		const ext = path.extname(file);
		const svelte_ext = config.extensions.find((ext) => file.endsWith(ext)); // unlike `ext`, could be e.g. `.svelte.md`

		/** @type {string} */
		let out_file;

		/** @type {string} */
		let out_contents;

		if (svelte_ext) {
			// it's a Svelte component
			out_file = file.slice(0, -svelte_ext.length) + '.svelte';
			out_contents = config.preprocess
				? (await preprocess(source, config.preprocess, { filename })).code
				: source;
		} else if (ext === '.ts' && file.endsWith('.d.ts')) {
			// TypeScript's declaration emit won't copy over the d.ts files, so we do it here
			out_file = file;
			out_contents = source;
			if (fs.existsSync(path.join(cwd, config.kit.package.dir, out_file))) {
				console.warn(
					'Found already existing file from d.ts generation for ' +
						out_file +
						'. This file will be overwritten.'
				);
			}
		} else if (ext === '.ts') {
			out_file = file.slice(0, -'.ts'.length) + '.js';
			out_contents = await transpile_ts(filename, source);
		} else {
			out_file = file;
			out_contents = source;
		}

		write(path.join(cwd, config.kit.package.dir, out_file), out_contents);

		if (exports_filter(file)) {
			const entry = `./${out_file}`;
			package_pkg.exports[entry] = entry;
		}
	}

	const main = package_pkg.exports['./index.js'] || package_pkg.exports['./index.svelte'];

	if (main) {
		package_pkg.exports['.'] = main;
	}

	write(
		path.join(cwd, config.kit.package.dir, 'package.json'),
		JSON.stringify(package_pkg, null, '  ')
	);

	const project_readme = path.join(cwd, 'README.md');
	const package_readme = path.join(cwd, config.kit.package.dir, 'README.md');

	if (fs.existsSync(project_readme) && !fs.existsSync(package_readme)) {
		fs.copyFileSync(project_readme, package_readme);
	}
}

/**
 * @param {string} filename
 * @param {string} source
 */
async function transpile_ts(filename, source) {
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
	const filedir = path.dirname(filename);
	const tsconfig_filename = ts.findConfigFile(filedir, ts.sys.fileExists);

	if (!tsconfig_filename) {
		throw new Error('Failed to locate tsconfig or jsconfig');
	}

	const { error, config } = ts.readConfigFile(tsconfig_filename, ts.sys.readFile);

	if (error) {
		throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
	}

	// Do this so TS will not search for initial files which might take a while
	config.include = [];
	config.files = [];
	const { options } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		path.dirname(tsconfig_filename),
		{ sourceMap: false },
		tsconfig_filename
	);
	return options;
}

/**
 * @param {{
 *   include: string[];
 *   exclude: string[];
 * }} options
 */
function create_filter(options) {
	const include = options.include.map((str) => str && globrex(str));
	const exclude = options.exclude.map((str) => str && globrex(str));

	/** @param {string} str */
	const filter = (str) =>
		include.some((glob) => glob.regex.test(str)) && !exclude.some((glob) => glob.regex.test(str));

	return filter;
}

/** @param {string} cwd */
function walk(cwd) {
	/** @type {string[]} */
	const all_files = [];

	/** @param {string} dir */
	function walk_dir(dir) {
		const files = fs.readdirSync(path.join(cwd, dir));

		for (const file of files) {
			const joined = path.join(dir, file);
			const stats = fs.statSync(path.join(cwd, joined));

			if (stats.isDirectory()) {
				walk_dir(joined);
			} else {
				all_files.push(joined);
			}
		}
	}

	walk_dir('');
	return all_files;
}

/**
 * @param {string} file
 * @param {string} contents
 */
function write(file, contents) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}
import { createRequire } from 'module';

/**
 * @param {import('types/config').ValidatedConfig} config
 */
export async function emit_dts(config) {
	const require = createRequire(import.meta.url);
	const emit = await try_load_svelte2tsx();
	emit({
		libRoot: config.kit.files.lib,
		svelteShimsPath: require.resolve('svelte2tsx/svelte-shims.d.ts'),
		declarationDir: config.kit.package.dir
	});
}

async function try_load_svelte2tsx() {
	try {
		const svelte2tsx = (await import('svelte2tsx')).emitDts;
		if (!svelte2tsx) {
			throw new Error('Old svelte2tsx version');
		}
		return svelte2tsx;
	} catch (e) {
		throw new Error(
			'You need to install svelte2tsx >=0.4.1 if you want to generate type definitions'
		);
	}
}
