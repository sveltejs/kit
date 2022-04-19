import * as fs from 'fs';
import * as path from 'path';
import colors from 'kleur';
import chokidar from 'chokidar';
import { preprocess } from 'svelte/compiler';
import { mkdirp, rimraf, walk } from '../utils/filesystem.js';
import { resolve_lib_alias, strip_lang_tags, unlink_all, write } from './utils.js';
import { emit_dts, transpile_ts } from './typescript.js';

const essential_files = ['README', 'LICENSE', 'CHANGELOG', '.gitignore', '.npmignore'];

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} cwd
 */
export async function build(config, cwd = process.cwd()) {
	const { lib } = config.kit.files;
	const { dir, emitTypes } = config.kit.package;

	if (!fs.existsSync(lib)) {
		throw new Error(`${lib} does not exist`);
	}

	rimraf(dir);
	mkdirp(dir); // TODO https://github.com/sveltejs/kit/issues/2333

	// Generate type definitions first so hand-written types can overwrite generated ones
	await emit_dts(config, cwd);

	const files = walk(lib);

	const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));

	delete pkg.scripts;
	pkg.type = 'module';

	/** @type {Record<string, string>} */
	const generated = { './package.json': './package.json' };

	/** @type {Record<string, string>} */
	const clashes = {};
	let contains_svelte_files = false;

	for (const file of files) {
		const ext = path.extname(file);
		const normalized = file.replace(/\\/g, '/');
		const svelte_ext = config.extensions.find((ext) => file.endsWith(ext)); // unlike `ext`, could be e.g. `.svelte.md`

		if (!config.kit.package.files(normalized)) {
			const base = svelte_ext ? file : file.slice(0, -ext.length);
			unlink_all(dir, normalized, base);
			continue;
		}

		const filename = path.join(lib, file);
		const source = fs.readFileSync(filename);

		/** @type {string} */
		let out_file;

		/** @type {string | Buffer} */
		let out_contents;

		if (svelte_ext) {
			// it's a Svelte component
			contains_svelte_files = true;
			out_file = file.slice(0, -svelte_ext.length) + '.svelte';
			out_contents = source.toString('utf-8');
			out_contents = config.preprocess
				? strip_lang_tags((await preprocess(out_contents, config.preprocess, { filename })).code)
				: out_contents;
			out_contents = resolve_lib_alias(out_file, out_contents, config);
		} else if (ext === '.ts' && file.endsWith('.d.ts')) {
			// TypeScript's declaration emit won't copy over the d.ts files, so we do it here
			out_file = file;
			out_contents = source.toString('utf-8');
			out_contents = resolve_lib_alias(out_file, out_contents, config);
			if (fs.existsSync(path.join(dir, out_file))) {
				console.warn(
					'Found already existing file from d.ts generation for ' +
						out_file +
						'. This file will be overwritten.'
				);
			}
		} else if (ext === '.ts') {
			out_file = file.slice(0, -'.ts'.length) + '.js';
			out_contents = await transpile_ts(filename, source.toString('utf-8'));
			out_contents = resolve_lib_alias(out_file, out_contents, config);
		} else {
			out_file = file;
			out_contents = source;
		}

		write(path.join(dir, out_file), out_contents);

		if (config.kit.package.exports(normalized)) {
			const original = `$lib/${normalized}`;
			const entry = `./${out_file.replace(/\\/g, '/')}`;
			const key = entry.replace(/\/index\.js$|(\/[^/]+)\.js$/, '$1');

			if (clashes[key]) {
				throw new Error(
					`Duplicate "${key}" export. Please remove or rename either ${clashes[key]} or ${original}`
				);
			}

			generated[key] = entry;
			clashes[key] = original;
		}
	}

	pkg.exports = { ...generated, ...pkg.exports };

	if (!pkg.svelte && contains_svelte_files) {
		// Several heuristics in Kit/vite-plugin-svelte to tell Vite to mark Svelte packages
		// rely on the "svelte" property. Vite/Rollup/Webpack plugin can all deal with it.
		// See https://github.com/sveltejs/kit/issues/1959 for more info and related threads.
		if (pkg.exports['.']) {
			const svelte_export =
				typeof pkg.exports['.'] === 'string'
					? pkg.exports['.']
					: pkg.exports['.'].import || pkg.exports['.'].default;
			if (svelte_export) {
				pkg.svelte = svelte_export;
			} else {
				console.warn(
					'Cannot generate a "svelte" entry point because the "." entry in "exports" is not a string. If you set it by hand, please also set one of the options as a "svelte" entry point\n'
				);
			}
		} else {
			console.warn(
				'Cannot generate a "svelte" entry point because the "." entry in "exports" is missing. Please specify one or set a "svelte" entry point yourself\n'
			);
		}
	}

	write(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

	const whitelist = fs.readdirSync(cwd).filter((file) => {
		const lowercased = file.toLowerCase();
		return essential_files.some((name) => lowercased.startsWith(name.toLowerCase()));
	});

	for (const pathname of whitelist) {
		const full_path = path.join(cwd, pathname);
		if (fs.lstatSync(full_path).isDirectory()) continue; // just to be sure

		const package_path = path.join(dir, pathname);
		if (!fs.existsSync(package_path)) fs.copyFileSync(full_path, package_path);
	}

	const from = path.relative(cwd, lib);
	const to = path.relative(cwd, dir);
	console.log(colors.bold().green(`${from} -> ${to}`));
	console.log(`Successfully built '${pkg.name}' package. To publish it to npm:`);
	console.log(colors.bold().cyan(`  cd ${to}`));
	console.log(colors.bold().cyan('  npm publish\n'));
}

/**
 * @param {import('types').ValidatedConfig} config
 */
export async function watch(config) {
	await build(config);

	const { lib } = config.kit.files;
	const { dir } = config.kit.package;

	chokidar.watch(lib, { ignoreInitial: true }).on('all', (event, file) => {
		const normalized = path.posix.relative(lib, file);

		if (!config.kit.package.files(normalized)) return;

		const ext = path.extname(normalized);
		const svelte_ext = config.extensions.find((ext) => normalized.endsWith(ext)); // unlike `ext`, could be e.g. `.svelte.md`
		const base = svelte_ext ? normalized : normalized.slice(0, -ext.length);

		if (event === 'unlink' || event === 'add') {
			console.log('TODO update package.json exports', { event, file });
			console.log('TODO emit_dts', { event, file });
		}

		if (event === 'unlink') {
			unlink_all(dir, normalized, base);
		}

		if (event === 'add' || event === 'change') {
			console.log('TODO emit_dts', { event, file });
			console.log('TODO process file', { event, file });
		}
	});
}
