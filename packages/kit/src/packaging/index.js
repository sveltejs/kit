import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import colors from 'kleur';
import { preprocess } from 'svelte/compiler';
import { mkdirp, rimraf, walk } from '../utils/filesystem.js';

const essential_files = ['README', 'LICENSE', 'CHANGELOG', '.gitignore', '.npmignore'];

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {string} cwd
 */
export async function make_package(config, cwd = process.cwd()) {
	if (!fs.existsSync(config.kit.files.lib)) {
		throw new Error(`${config.kit.files.lib} does not exist`);
	}

	const package_dir = path.isAbsolute(config.kit.package.dir)
		? config.kit.package.dir
		: path.join(cwd, config.kit.package.dir);
	rimraf(package_dir);
	mkdirp(package_dir); // TODO https://github.com/sveltejs/kit/issues/2333

	if (config.kit.package.emitTypes) {
		// Generate type definitions first so hand-written types can overwrite generated ones
		await emit_dts(config);
		// Resolve aliases, TS leaves them as-is
		const files = walk(package_dir);
		for (const file of files) {
			const filename = path.join(package_dir, file);
			const source = fs.readFileSync(filename, 'utf8');
			fs.writeFileSync(filename, resolve_$lib_alias(file, source, config));
		}
	}

	const files = walk(config.kit.files.lib);

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
			const dts_file = (svelte_ext ? file : file.slice(0, -ext.length)) + '.d.ts';
			const dts_path = path.join(package_dir, dts_file);
			if (fs.existsSync(dts_path)) {
				fs.unlinkSync(dts_path);

				const dir = path.dirname(dts_path);
				if (fs.readdirSync(dir).length === 0) {
					fs.rmdirSync(dir);
				}
			}
			continue;
		}

		const filename = path.join(config.kit.files.lib, file);
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
			out_contents = resolve_$lib_alias(out_file, out_contents, config);
		} else if (ext === '.ts' && file.endsWith('.d.ts')) {
			// TypeScript's declaration emit won't copy over the d.ts files, so we do it here
			out_file = file;
			out_contents = source.toString('utf-8');
			out_contents = resolve_$lib_alias(out_file, out_contents, config);
			if (fs.existsSync(path.join(package_dir, out_file))) {
				console.warn(
					'Found already existing file from d.ts generation for ' +
						out_file +
						'. This file will be overwritten.'
				);
			}
		} else if (ext === '.ts') {
			out_file = file.slice(0, -'.ts'.length) + '.js';
			out_contents = await transpile_ts(filename, source.toString('utf-8'));
			out_contents = resolve_$lib_alias(out_file, out_contents, config);
		} else {
			out_file = file;
			out_contents = source;
		}

		write(path.join(package_dir, out_file), out_contents);

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
					'Cannot generate a "svelte" entry point because ' +
						'the "." entry in "exports" is not a string. ' +
						'If you set it by hand, please also set one of the options as a "svelte" entry point\n'
				);
			}
		} else {
			console.warn(
				'Cannot generate a "svelte" entry point because ' +
					'the "." entry in "exports" is missing. ' +
					'Please specify one or set a "svelte" entry point yourself\n'
			);
		}
	}

	write(path.join(package_dir, 'package.json'), JSON.stringify(pkg, null, 2));

	const whitelist = fs.readdirSync(cwd).filter((file) => {
		const lowercased = file.toLowerCase();
		return essential_files.some((name) => lowercased.startsWith(name.toLowerCase()));
	});
	for (const pathname of whitelist) {
		const full_path = path.join(cwd, pathname);
		if (fs.lstatSync(full_path).isDirectory()) continue; // just to be sure

		const package_path = path.join(package_dir, pathname);
		if (!fs.existsSync(package_path)) fs.copyFileSync(full_path, package_path);
	}

	const from = path.relative(cwd, config.kit.files.lib);
	const to = path.relative(cwd, config.kit.package.dir);
	console.log(colors.bold().green(`${from} -> ${to}`));
	console.log(`Successfully built '${pkg.name}' package. To publish it to npm:`);
	console.log(colors.bold().cyan(`  cd ${to}`));
	console.log(colors.bold().cyan('  npm publish\n'));
}

/**
 * Resolves the `$lib` alias.
 *
 * TODO: make this more generic to also handle other aliases the user could have defined
 * via `kit.vite.resolve.alias`. Also investigate how to do this in a more robust way
 * (right now regex string replacement is used).
 * For more discussion see https://github.com/sveltejs/kit/pull/2453
 *
 * @param {string} file Relative to the lib root
 * @param {string} content
 * @param {import('types/config').ValidatedConfig} config
 * @returns {string}
 */
function resolve_$lib_alias(file, content, config) {
	/**
	 * @param {string} match
	 * @param {string} _
	 * @param {string} import_path
	 */
	const replace_import_path = (match, _, import_path) => {
		if (!import_path.startsWith('$lib/')) {
			return match;
		}

		const full_path = path.join(config.kit.files.lib, file);
		const full_import_path = path.join(config.kit.files.lib, import_path.slice('$lib/'.length));
		let resolved = path.relative(path.dirname(full_path), full_import_path).replace(/\\/g, '/');
		resolved = resolved.startsWith('.') ? resolved : './' + resolved;
		return match.replace(import_path, resolved);
	};
	content = content.replace(/from\s+('|")([^"';,]+?)\1/g, replace_import_path);
	content = content.replace(/import\s*\(\s*('|")([^"';,]+?)\1\s*\)/g, replace_import_path);
	return content;
}

/**
 * Strip out lang="X" or type="text/X" tags. Doing it here is only a temporary solution.
 * See https://github.com/sveltejs/kit/issues/2450 for ideas for places where it's handled better.
 *
 * @param {string} content
 */
function strip_lang_tags(content) {
	strip_lang_tag('script');
	strip_lang_tag('style');
	return content;

	/**
	 * @param {string} tagname
	 */
	function strip_lang_tag(tagname) {
		const regexp = new RegExp(
			`/<!--[^]*?-->|<${tagname}(\\s[^]*?)?(?:>([^]*?)<\\/${tagname}>|\\/>)`,
			'g'
		);
		content = content.replace(regexp, (tag, attributes) => {
			if (!attributes) return tag;
			const idx = tag.indexOf(attributes);
			return (
				tag.substring(0, idx) +
				attributes.replace(/\s(type|lang)=(["']).*?\2/, ' ') +
				tag.substring(idx + attributes.length)
			);
		});
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
 * @param {string} file
 * @param {Parameters<typeof fs.writeFileSync>[1]} contents
 */
function write(file, contents) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}

/**
 * @param {import('types/config').ValidatedConfig} config
 */
export async function emit_dts(config) {
	const require = createRequire(import.meta.url);
	const emit = await try_load_svelte2tsx();
	await emit({
		libRoot: config.kit.files.lib,
		svelteShimsPath: require.resolve('svelte2tsx/svelte-shims.d.ts'),
		declarationDir: config.kit.package.dir
	});
}

async function try_load_svelte2tsx() {
	const svelte2tsx = await load();
	const emit_dts = svelte2tsx.emitDts;
	if (!emit_dts) {
		throw new Error(
			'You need to install svelte2tsx >=0.4.1 if you want to generate type definitions'
		);
	}
	return emit_dts;

	async function load() {
		try {
			return await import('svelte2tsx');
		} catch (e) {
			throw new Error(
				'You need svelte2tsx and typescript if you want to generate type definitions. Install it through your package manager, or disable generation which is highly discouraged. See https://kit.svelte.dev/docs#packaging'
			);
		}
	}
}
