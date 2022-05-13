import * as fs from 'fs';
import { dirname, join, relative } from 'path';
import colors from 'kleur';
import chokidar from 'chokidar';
import { preprocess } from 'svelte/compiler';
import { copy, mkdirp, rimraf } from '../utils/filesystem.js';
import { analyze, generate_pkg, resolve_lib_alias, scan, strip_lang_tags, write } from './utils.js';
import { emit_dts, transpile_ts } from './typescript.js';
import { write_tsconfig } from '../core/sync/write_tsconfig.js';

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
	mkdirp(dir);

	// Make sure generated tsconfig is up-to-date
	write_tsconfig(config);

	const files = scan(config);

	if (config.kit.package.emitTypes) {
		await emit_dts(config, cwd, files);
	}

	const pkg = generate_pkg(cwd, files);

	if (!pkg.svelte && files.some((file) => file.is_svelte)) {
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
	await build(config, cwd);

	const message = `\nWatching ${relative(cwd, config.kit.files.lib)} for changes...\n`;

	console.log(message);

	const { lib } = config.kit.files;
	const { dir } = config.kit.package;

	/** @type {Array<{ file: import('./types').File, type: string }>} */
	const pending = [];

	/** @type {Array<(value?: any) => void>} */
	const fulfillers = [];

	/** @type {NodeJS.Timeout} */
	let timeout;

	const watcher = chokidar.watch(lib, { ignoreInitial: true });

	watcher.on('all', async (type, path) => {
		const file = analyze(config, relative(lib, path));
		if (!file.is_included) return;

		pending.push({ file, type });

		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			const files = scan(config);

			let should_update_pkg = false;

			const events = pending.slice();
			pending.length = 0;

			for (const { file, type } of events) {
				if ((type === 'unlink' || type === 'add') && file.is_exported) {
					should_update_pkg = true;
				}

				if (type === 'unlink') {
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

				if (type === 'add' || type === 'change') {
					await process_file(config, file);
					console.log(`Processing ${file.name}`);
				}
			}

			if (should_update_pkg) {
				const pkg = generate_pkg(cwd, files);
				write(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
				console.log('Updated package.json');
			}

			if (config.kit.package.emitTypes) {
				await emit_dts(config, cwd, scan(config));
				console.log('Updated .d.ts files');
			}

			console.log(message);

			fulfillers.forEach((fn) => fn());
		}, 100);
	});

	return {
		watcher,
		settled: () =>
			new Promise((fulfil, reject) => {
				fulfillers.push(fulfil);
				setTimeout(() => reject(new Error('Timed out')), 1000);
			})
	};
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
