import * as fs from 'fs';
import * as path from 'path';
import colors from 'kleur';
import chokidar from 'chokidar';
import { preprocess } from 'svelte/compiler';
import { mkdirp, rimraf } from '../utils/filesystem.js';
import {
	generate_pkg,
	resolve_lib_alias,
	scan,
	strip_lang_tags,
	unlink_all,
	write
} from './utils.js';
import { emit_dts, transpile_ts } from './typescript.js';

const essential_files = ['README', 'LICENSE', 'CHANGELOG', '.gitignore', '.npmignore'];

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} cwd
 */
export async function build(config, cwd = process.cwd()) {
	const { lib } = config.kit.files;
	const { dir } = config.kit.package;

	if (!fs.existsSync(lib)) {
		throw new Error(`${lib} does not exist`);
	}

	rimraf(dir);
	mkdirp(dir); // TODO https://github.com/sveltejs/kit/issues/2333

	const source = scan(config);

	await emit_dts(config, cwd, source);

	const pkg = generate_pkg(cwd, source);
	write(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

	for (const file of source) {
		if (!file.included) continue;

		const ext = path.extname(file.name);
		const svelte_ext = config.extensions.find((ext) => file.name.endsWith(ext)); // unlike `ext`, could be e.g. `.svelte.md`

		const filename = path.join(lib, file.name);

		let out_file = file.name;

		/** @type {string | Buffer} */
		let out_contents = fs.readFileSync(filename);

		if (svelte_ext) {
			// it's a Svelte component
			out_file = file.name.slice(0, -svelte_ext.length) + '.svelte';
			out_contents = out_contents.toString('utf-8');

			if (config.preprocess) {
				const preprocessed = (await preprocess(out_contents, config.preprocess, { filename })).code;
				out_contents = strip_lang_tags(preprocessed);
			}

			out_contents = resolve_lib_alias(out_file, out_contents, config);
		} else if (file.name.endsWith('.d.ts')) {
			// TypeScript's declaration emit won't copy over the d.ts files, so we do it here
			out_contents = out_contents.toString('utf-8');
			out_contents = resolve_lib_alias(out_file, out_contents, config);
			if (fs.existsSync(path.join(dir, out_file))) {
				console.warn(
					`Found already existing file from d.ts generation for ${out_file}. This file will be overwritten.`
				);
			}
		} else if (ext === '.ts') {
			out_file = file.base + '.js';
			out_contents = await transpile_ts(filename, out_contents.toString('utf-8'));
			out_contents = resolve_lib_alias(out_file, out_contents, config);
		}

		write(path.join(dir, out_file), out_contents);
	}

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
export async function watch(config, cwd = process.cwd()) {
	await build(config);

	const { lib } = config.kit.files;
	const { dir } = config.kit.package;

	chokidar.watch(lib, { ignoreInitial: true }).on('all', async (event, file) => {
		const normalized = path.posix.relative(lib, file);

		if (!config.kit.package.files(normalized)) return;

		const ext = path.extname(normalized);
		const svelte_ext = config.extensions.find((ext) => normalized.endsWith(ext)); // unlike `ext`, could be e.g. `.svelte.md`
		const base = svelte_ext ? normalized : normalized.slice(0, -ext.length);

		if (event === 'unlink' || event === 'add') {
			console.log('TODO update package.json exports', { event, file });
		}

		if (event === 'unlink') {
			unlink_all(dir, normalized, base);
		}

		if (event === 'add' || event === 'change') {
			console.log('TODO process file', { event, file });
		}

		await emit_dts(config, cwd, scan(config));
	});
}
