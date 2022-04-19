import * as fs from 'fs';
import * as path from 'path';
import colors from 'kleur';
import chokidar from 'chokidar';
import { preprocess } from 'svelte/compiler';
import { copy, mkdirp, rimraf } from '../utils/filesystem.js';
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

		const filename = path.join(lib, file.name);

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
			write(path.join(dir, file.dest), contents);
		} else {
			copy(filename, path.join(dir, file.dest));
		}
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
