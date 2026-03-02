import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { posixify, mkdirp, walk } from './filesystem.js';
import { resolve_aliases, write } from './utils.js';
import { resolve_svelte_shims } from './typescript.js';

const CACHE_DIR_NAME = '__package_types_cache__';
const SVELTE_SUBDIR = 'svelte';
const DECLARATIONS_SUBDIR = 'declarations';
const MANIFEST_VERSION = 1;

/**
 * Incremental declaration emit — drop-in replacement for `emit_dts()`.
 * Pre-transpiles `.svelte` files via `svelte2tsx()`, writes an overlay tsconfig,
 * then spawns `tsc` or `tsgo` as a child process to produce `.d.ts` files.
 *
 * @param {string} input       Absolute path to lib source dir
 * @param {string} output      Temp staging dir (`__package__`)
 * @param {string} final_output Absolute path to final output dir
 * @param {string} cwd         Project root
 * @param {Record<string, string>} alias  Alias map (e.g. { $lib: '/abs/src/lib' })
 * @param {import('./types.js').File[]} files  Scanned source files
 * @param {string | undefined} tsconfig  Path to user's tsconfig/jsconfig
 * @param {{ incremental?: boolean, tsgo?: boolean }} options
 */
export async function emit_dts_incremental(
	input,
	output,
	final_output,
	cwd,
	alias,
	files,
	tsconfig,
	options
) {
	const out_dir = path.resolve(cwd, '.svelte-kit', CACHE_DIR_NAME);
	const svelte_dir = path.join(out_dir, SVELTE_SUBDIR);
	const declarations_dir = path.join(out_dir, DECLARATIONS_SUBDIR);

	mkdirp(svelte_dir);
	mkdirp(declarations_dir);

	const emit_result = await emit_svelte_files(input, out_dir, svelte_dir, files, cwd);
	const overlay_path = await write_overlay_tsconfig(
		out_dir,
		svelte_dir,
		declarations_dir,
		input,
		cwd,
		tsconfig,
		emit_result,
		options
	);
	await run_tsc(overlay_path, declarations_dir, cwd, options);
	collect_declarations(
		declarations_dir,
		svelte_dir,
		input,
		output,
		final_output,
		alias,
		files,
		cwd
	);
}

// ---------------------------------------------------------------------------
// 1. Pre-transpile .svelte files
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   mtimeMs: number,
 *   size: number,
 *   isTsFile: boolean,
 *   outPath: string,
 *   dtsPath: string
 * }} ManifestEntry
 */

/**
 * @typedef {{
 *   version: number,
 *   entries: Record<string, ManifestEntry>
 * }} Manifest
 */

/**
 * Pre-transpile `.svelte` files to `.ts` via `svelte2tsx()`.
 * Unchanged files (by mtime+size) are skipped using a manifest.
 *
 * @param {string} input
 * @param {string} cache_dir
 * @param {string} svelte_dir
 * @param {import('./types.js').File[]} files
 * @param {string} cwd
 * @returns {Promise<{ shim_files: string[], svelte_files: string[] }>}
 */
async function emit_svelte_files(input, cache_dir, svelte_dir, files, cwd) {
	const { svelte2tsx } = await import('svelte2tsx');
	const { parse, VERSION } = await import('svelte/compiler');

	const manifest_path = path.join(cache_dir, 'manifest.json');
	const manifest = load_manifest(manifest_path);

	const shims_path = resolve_svelte_shims(cwd);

	const svelte_files = files.filter((f) => f.is_svelte);
	const emitted = [];

	for (const file of svelte_files) {
		const source_path = path.join(input, file.name);
		const stat = fs.statSync(source_path);
		const existing = manifest.entries[file.name];

		// Check manifest for cache hit before computing derived paths
		if (existing && existing.mtimeMs === stat.mtimeMs && existing.size === stat.size) {
			emitted.push(file.name);
			continue;
		}

		// Derive output filenames: ++ComponentName.svelte.ts and ComponentName.svelte.d.ts
		const base_name = path.basename(file.name);
		const dir_name = path.dirname(file.name);
		const tsx_name = `++${base_name}.ts`;
		const dts_name = `${base_name}.d.ts`;

		const out_path = path.join(svelte_dir, dir_name, tsx_name);
		const dts_path = path.join(svelte_dir, dir_name, dts_name);

		const source = fs.readFileSync(source_path, 'utf8');
		const is_ts_file = /\blang\s*=\s*["']ts["']/.test(source);

		try {
			const result = svelte2tsx(source, {
				parse,
				version: VERSION,
				filename: source_path,
				isTsFile: is_ts_file,
				mode: 'dts',
				emitOnTemplateError: false,
				emitJsDoc: true,
				rewriteExternalImports: {
					workspacePath: cwd,
					generatedPath: out_path
				}
			});

			write(out_path, result.code);

			// Write a thin .svelte.d.ts stub that re-exports from the ++ file.
			// This allows TS to resolve `.svelte` imports via the stub.
			const relative_tsx = `./${tsx_name}`;
			const stub = `export { default } from '${relative_tsx}';\nexport * from '${relative_tsx}';\n`;
			write(dts_path, stub);

			manifest.entries[file.name] = {
				mtimeMs: stat.mtimeMs,
				size: stat.size,
				isTsFile: is_ts_file,
				outPath: posixify(path.relative(cwd, out_path)),
				dtsPath: posixify(path.relative(cwd, dts_path))
			};

			emitted.push(file.name);
		} catch (e) {
			console.error(`Error transpiling ${file.name}: ${/** @type {Error} */ (e).message}`);
		}
	}

	// Remove manifest entries for files that no longer exist
	for (const key of Object.keys(manifest.entries)) {
		if (!svelte_files.some((f) => f.name === key)) {
			const entry = manifest.entries[key];
			// Clean up generated files — ignore ENOENT if already gone
			try {
				fs.unlinkSync(path.resolve(cwd, entry.outPath));
			} catch {}
			try {
				fs.unlinkSync(path.resolve(cwd, entry.dtsPath));
			} catch {}
			delete manifest.entries[key];
		}
	}

	save_manifest(manifest_path, manifest);

	return {
		shim_files: [shims_path],
		svelte_files: emitted
	};
}

/**
 * @param {string} manifest_path
 * @returns {Manifest}
 */
function load_manifest(manifest_path) {
	try {
		const data = JSON.parse(fs.readFileSync(manifest_path, 'utf8'));
		if (data.version === MANIFEST_VERSION) return data;
	} catch {
		// ignore
	}
	return { version: MANIFEST_VERSION, entries: {} };
}

/**
 * @param {string} manifest_path
 * @param {Manifest} manifest
 */
function save_manifest(manifest_path, manifest) {
	fs.writeFileSync(manifest_path, JSON.stringify(manifest, null, '\t'));
}

// ---------------------------------------------------------------------------
// 2. Generate overlay tsconfig
// ---------------------------------------------------------------------------

/**
 * Write an overlay tsconfig that extends the user's tsconfig, adding
 * declaration emit settings and rootDirs so TS resolves the virtual .svelte files.
 *
 * @param {string} cache_dir
 * @param {string} svelte_dir
 * @param {string} declarations_dir
 * @param {string} input
 * @param {string} cwd
 * @param {string | undefined} tsconfig
 * @param {{ shim_files: string[], svelte_files: string[] }} emit_result
 * @param {{ incremental?: boolean, tsgo?: boolean }} options
 * @returns {Promise<string>}  Path to the overlay tsconfig
 */
async function write_overlay_tsconfig(
	cache_dir,
	svelte_dir,
	declarations_dir,
	input,
	cwd,
	tsconfig,
	emit_result,
	options
) {
	const ts = (await import('typescript')).default;

	// Resolve the user's tsconfig
	let config_path = tsconfig;
	if (!config_path) {
		const ts_path = path.join(cwd, 'tsconfig.json');
		const js_path = path.join(cwd, 'jsconfig.json');
		if (fs.existsSync(ts_path)) config_path = ts_path;
		else if (fs.existsSync(js_path)) config_path = js_path;
		else {
			throw new Error(
				'Failed to locate tsconfig or jsconfig. Incremental declaration emit requires one.'
			);
		}
	}

	// Read the raw config to extract include/exclude/files/compilerOptions
	const { error, config: raw_config } = ts.readConfigFile(config_path, ts.sys.readFile);
	if (error) {
		throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
	}

	const raw_compiler = raw_config.compilerOptions ?? {};

	// Build overlay compiler options
	/** @type {Record<string, any>} */
	const compiler_options = {
		declaration: true,
		emitDeclarationOnly: true,
		declarationDir: path.relative(cache_dir, declarations_dir),
		noEmit: false,
		skipLibCheck: true,
		// Bundler resolution works with ESNext modules and resolves from node_modules —
		// needed because the svelte2tsx output imports from 'svelte' and other packages
		moduleResolution: 'bundler',
		allowArbitraryExtensions: true,
		// Ensure rootDirs includes both the original source dir and the svelte emit dir
		// so that TS can resolve .svelte imports via the stubs
		rootDirs: [path.relative(cache_dir, input), path.relative(cache_dir, svelte_dir)],
		// Carry forward declarationMap and paths from the original config
		...(raw_compiler.declarationMap ? { declarationMap: true } : {}),
		...(raw_compiler.paths ? { paths: raw_compiler.paths } : {})
	};

	if (options.incremental) {
		compiler_options.incremental = true;
		compiler_options.tsBuildInfoFile = path.relative(
			cache_dir,
			path.join(cache_dir, 'tsbuildinfo.json')
		);
	}

	// Scope include to just the lib source directory and the svelte emit dir
	const rel_input = posixify(path.relative(cache_dir, input));
	const rel_svelte = posixify(path.relative(cache_dir, svelte_dir));
	const include = [`${rel_input}/**/*`, `${rel_svelte}/**/*`];

	// Exclude node_modules and common output directories
	const rel_cwd = posixify(path.relative(cache_dir, cwd));
	const exclude = [`${rel_cwd}/node_modules`, `${rel_cwd}/**/dist`, `${rel_cwd}/**/expected`];

	// Shim files need to be explicitly listed
	const file_list = emit_result.shim_files.map((f) => posixify(path.relative(cache_dir, f)));

	const overlay = {
		extends: posixify(path.relative(cache_dir, path.resolve(config_path))),
		compilerOptions: compiler_options,
		include,
		exclude,
		files: file_list
	};

	const overlay_path = path.join(cache_dir, 'tsconfig.overlay.json');
	fs.writeFileSync(overlay_path, JSON.stringify(overlay, null, '\t'));

	return overlay_path;
}

// ---------------------------------------------------------------------------
// 3. Spawn tsc / tsgo
// ---------------------------------------------------------------------------

/**
 * Spawn `tsc` or `tsgo` as a child process to emit `.d.ts` files.
 *
 * @param {string} tsconfig_path  Path to the overlay tsconfig
 * @param {string} declarations_dir  Where declarations are emitted
 * @param {string} cwd  Project root (for resolving dependencies)
 * @param {{ incremental?: boolean, tsgo?: boolean }} options
 * @returns {Promise<void>}
 */
async function run_tsc(tsconfig_path, declarations_dir, cwd, options) {
	// tsc is our own dependency; tsgo is the target project's optional dependency
	const own_require = createRequire(import.meta.url);
	const project_require = createRequire(path.join(cwd, 'package.json'));

	/** @type {string} */
	let compiler_bin;

	if (options.tsgo) {
		try {
			const tsgo_pkg = project_require.resolve('@typescript/native-preview/package.json');
			const tsgo_dir = path.dirname(tsgo_pkg);
			// tsgo exposes its binary via package.json "bin" field
			const tsgo_json = JSON.parse(fs.readFileSync(tsgo_pkg, 'utf8'));
			const bin_entry = tsgo_json.bin?.tsgo;
			if (bin_entry) {
				compiler_bin = path.resolve(tsgo_dir, bin_entry);
			} else {
				// Fallback: look for common locations
				const candidates = ['bin/tsgo', 'built/local/tsgo.js', 'tsgo.js'];
				const found = candidates
					.map((c) => path.resolve(tsgo_dir, c))
					.find((c) => fs.existsSync(c));
				if (!found) {
					throw new Error('Could not locate tsgo binary');
				}
				compiler_bin = found;
			}
		} catch (/** @type {any} */ e) {
			if (e.code === 'MODULE_NOT_FOUND') {
				throw new Error(
					'--tsgo requires @typescript/native-preview to be installed.\n' +
						'Install it with: npm install -D @typescript/native-preview',
					{ cause: e }
				);
			}
			throw new Error('Failed to resolve tsgo compiler', { cause: e });
		}
	} else {
		compiler_bin = own_require.resolve('typescript/bin/tsc');
	}

	/** @type {string[]} */
	const args = [];
	const is_js_bin = compiler_bin.endsWith('.js');

	if (is_js_bin) {
		// Need to spawn via node
		args.push(compiler_bin);
	}

	args.push('-p', tsconfig_path, '--pretty', 'true', '--noErrorTruncation');

	const { stdout, stderr, exit_code } = await new Promise((resolve) => {
		const bin = is_js_bin ? process.execPath : compiler_bin;
		// Don't pipe output — we parse and filter errors below.
		// Only user file errors are surfaced; svelte2tsx ++ file errors are expected.
		execFile(bin, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
			resolve({
				stdout: stdout || '',
				stderr: stderr || '',
				exit_code: error ? /** @type {any} */ (error.code ?? 1) : 0
			});
		});
	});

	if (exit_code !== 0) {
		// Parse tsc errors, separating user errors from expected svelte2tsx dts-mode errors.
		// The ++ prefixed files are intermediate svelte2tsx output and may have harmless
		// errors (missing locals stripped in dts mode). Only fail on user file errors.
		const combined = stdout + '\n' + stderr;
		const user_errors = combined
			.split('\n')
			.filter((line) => /error TS\d+/.test(line) && !line.includes('++'));

		if (user_errors.length > 0) {
			throw new Error('Type generation failed:\n' + user_errors.join('\n'));
		}
		// If only svelte2tsx internal errors, declarations were still emitted — continue
	}
}

// ---------------------------------------------------------------------------
// 4. Collect declarations into output
// ---------------------------------------------------------------------------

/**
 * Walk the declarations output, post-process `.d.ts` files (strip `++` prefix,
 * resolve aliases, fix sourcemap paths), and write to the staging directory.
 *
 * tsc emits declarations preserving the full directory structure from the common root.
 * Source files land under `declarations/src/lib/...` and svelte files under
 * `declarations/.svelte-kit/__package_types_cache__/svelte/...`. We map both
 * back to lib-relative paths.
 *
 * @param {string} declarations_dir
 * @param {string} svelte_dir  Absolute path to the svelte emit dir
 * @param {string} input
 * @param {string} output
 * @param {string} final_output
 * @param {Record<string, string>} alias
 * @param {import('./types.js').File[]} files
 * @param {string} cwd
 */
function collect_declarations(
	declarations_dir,
	svelte_dir,
	input,
	output,
	final_output,
	alias,
	files,
	cwd
) {
	if (!fs.existsSync(declarations_dir)) return;

	const handwritten = new Set();
	for (const file of files) {
		if (file.name.endsWith('.d.ts')) {
			handwritten.add(file.name);
		}
	}

	// Compute the prefixes that tsc uses in the declarations output.
	// tsc rootDir is auto-computed as the common ancestor of all input files.
	// The declarations mirror the source structure relative to that root.
	const rel_input = posixify(path.relative(cwd, input));
	const rel_svelte = posixify(path.relative(cwd, svelte_dir));

	for (const file of walk(declarations_dir)) {
		const raw = posixify(file);

		// Skip non-declaration files
		if (!raw.endsWith('.d.ts') && !raw.endsWith('.d.ts.map')) {
			continue;
		}

		// Map the tsc output path to the lib-relative path.
		// Source files: "src/lib/index.d.ts" → "index.d.ts"
		// Svelte files: ".svelte-kit/__package_types_cache__/svelte/++Test.svelte.d.ts" → "Test.svelte.d.ts"
		let lib_relative;
		if (raw.startsWith(rel_svelte + '/')) {
			lib_relative = raw.slice(rel_svelte.length + 1).replace(/\+\+/g, '');
		} else if (raw.startsWith(rel_input + '/')) {
			lib_relative = raw.slice(rel_input.length + 1);
		} else {
			// Unknown path — skip
			continue;
		}

		// Skip if hand-written .d.ts exists
		if (handwritten.has(lib_relative)) {
			console.warn(`Using $lib/${lib_relative} instead of generated .d.ts file`);
			continue;
		}

		let source = fs.readFileSync(path.join(declarations_dir, file), 'utf8');

		if (lib_relative.endsWith('.d.ts.map')) {
			// Fix source paths in sourcemaps — same logic as emit_dts in typescript.js
			const parsed = JSON.parse(source);
			if (parsed.sources) {
				parsed.sources = /** @type {string[]} */ (parsed.sources).map((/** @type {string} */ src) =>
					posixify(
						path.join(
							path.relative(
								path.dirname(path.join(final_output, lib_relative)),
								path.dirname(path.join(input, lib_relative))
							),
							path.basename(src)
						)
					)
				);
				source = JSON.stringify(parsed);
			}
		} else {
			// Resolve $lib and other aliases in .d.ts content
			source = resolve_aliases(input, lib_relative, source, alias);
			// Clean up any remaining references to ++ prefixed files
			source = source.replace(/\+\+/g, '');
		}

		write(path.join(output, lib_relative), source);
	}
}
