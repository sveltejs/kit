import * as fs from 'fs';
import { dirname, join, relative } from 'path';
import colors from 'kleur';
import chokidar from 'chokidar';
import { preprocess } from 'svelte/compiler';
import { copy, mkdirp, rimraf } from '../utils/filesystem.js';
import { analyze, generate_pkg, resolve_lib_alias, scan, strip_lang_tags, write } from './utils.js';
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

	const files = scan(config);

	if (config.kit.package.emitTypes) {
		await emit_dts(config, cwd, files);
	}

	const pkg = generate_pkg(cwd, files);
	write(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

	for (const file of files) {
		await process_file(config, file);
	}

	const whitelist = fs.readdirSync(cwd).filter((file) => {
		const lowercased = file.toLowerCase();
		return essential_files.some((name) => lowercased.startsWith(name.toLowerCase()));
	});

	for (const pathname of whitelist) {
		const full_path = join(cwd, pathname);
		if (fs.lstatSync(full_path).isDirectory()) continue; // just to be sure

		const package_path = join(dir, pathname);
		if (!fs.existsSync(package_path)) fs.copyFileSync(full_path, package_path);
	}

	const from = relative(cwd, lib);
	const to = relative(cwd, dir);
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

	chokidar.watch(lib, { ignoreInitial: true }).on('all', async (event, path) => {
		const file = analyze(config, path);
		if (!file.is_included) return;

		const files = scan(config);

		if ((event === 'unlink' || event === 'add') && file.is_exported) {
			const pkg = generate_pkg(cwd, files);
			write(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
			console.log('Updated package.json');
		}

		if (event === 'unlink') {
			for (const candidate of [
				file.name,
				`${file.base}.d.ts`,
				`${file.base}.d.mts`,
				`${file.base}.d.cts`
			]) {
				const resolved = join(dir, candidate);

				if (fs.existsSync(resolved)) {
					fs.unlinkSync(resolved);

					const parent = dirname(resolved);
					if (parent !== dir && fs.readdirSync(parent).length === 0) {
						fs.rmdirSync(parent);
					}
				}
			}
			console.log(`Removed ${file.dest}`);
		}

		if (event === 'add' || event === 'change') {
			await process_file(config, file);
			console.log(`Processed ${file.name}`);
		}

		if (config.kit.package.emitTypes) {
			await emit_dts(config, cwd, scan(config));
			console.log('Updated .d.ts files');
		}
	});
}

/**
 * @param {import('types').ValidatedConfig} config
 * @param {import('./types').File} file
 */
async function process_file(config, file) {
	if (!file.is_included) return;

	const filename = join(config.kit.files.lib, file.name);
	const dest = join(config.kit.package.dir, file.dest);

	if (file.is_svelte || file.name.endsWith('.ts')) {
		let contents = fs.readFileSync(filename, 'utf-8');

		if (file.is_svelte) {
			if (config.preprocess) {
				const preprocessed = (await preprocess(contents, config.preprocess, { filename })).code;
				contents = strip_lang_tags(preprocessed);
			}
		}

		if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
			contents = await transpile_ts(filename, contents);
		}

		contents = resolve_lib_alias(file.name, contents, config);
		write(dest, contents);
	} else {
		copy(filename, dest);
	}
}
