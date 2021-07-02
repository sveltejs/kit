import * as path from 'path';
import { createRequire } from 'module';

/**
 * @param {import('typescript')} ts
 * @param {import('types/config').ValidatedConfig} config
 * @param {string} cwd
 */
export async function emit_dts(ts, config, cwd) {
	const svelte_map = await create_svelte_map(ts, config);
	const { options, filenames } = load_tsconfig(ts, config, svelte_map);
	const host = await create_ts_compiler_host(ts, options, svelte_map, cwd);
	const program = ts.createProgram(filenames, options, host);
	program.emit();
}

/**
 * @param {import('typescript')} ts
 * @param {import('types/config').ValidatedConfig} config
 * @param {SvelteMap} svelte_map
 */
function load_tsconfig(ts, config, svelte_map) {
	const lib_root = config.kit.files.lib;

	const jsconfig_file = ts.findConfigFile(lib_root, ts.sys.fileExists, 'jsconfig.json');
	let tsconfig_file = ts.findConfigFile(lib_root, ts.sys.fileExists);

	if (!tsconfig_file && !jsconfig_file) {
		throw new Error('Failed to locate tsconfig or jsconfig');
	}

	tsconfig_file = tsconfig_file || jsconfig_file;
	if (jsconfig_file && is_subpath(path.dirname(tsconfig_file), path.dirname(jsconfig_file))) {
		tsconfig_file = jsconfig_file;
	}

	tsconfig_file = path.isAbsolute(tsconfig_file)
		? tsconfig_file
		: path.join(lib_root, tsconfig_file);
	const basepath = path.dirname(tsconfig_file);
	const { error, config: ts_config } = ts.readConfigFile(tsconfig_file, ts.sys.readFile);

	if (error) {
		throw new Error('Malformed tsconfig\n' + JSON.stringify(error, null, 2));
	}

	// Rewire includes and files. This ensures that only the files inside the lib are traversed and
	// that the outputted types have the correct directory depth.
	// This is a little brittle because we then may include more than the user wants
	const lib_path_relative = path.relative(basepath, lib_root).split(path.sep).join('/');
	ts_config.include = [`${lib_path_relative}/**/*`];
	ts_config.files = [];

	const { options, fileNames } = ts.parseJsonConfigFileContent(
		ts_config,
		ts.sys,
		basepath,
		{ sourceMap: false },
		tsconfig_file,
		undefined,
		[{ extension: 'svelte', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }]
	);

	const filenames = fileNames.map((name) => {
		if (!is_svelte_filepath(name)) {
			return name;
		}
		// We need to trick TypeScript into thinking that Svelte files
		// are either TS or JS files in order to generate correct d.ts
		// definition files.
		const is_ts_file = svelte_map.add(name);
		return name + (is_ts_file ? '.ts' : '.js');
	});

	// require.resolve-equivalent in ESM is still experimental, therefore create require here
	const require = createRequire(import.meta.url);
	// Add ambient functions so TS knows how to resolve its invocations in the
	// code output of svelte2tsx.
	filenames.push(require.resolve('svelte2tsx/svelte-shims.d.ts'));

	return {
		options: {
			...options,
			declaration: true,
			emitDeclarationOnly: true,
			declarationDir: config.kit.package.dir,
			allowNonTsExtensions: true
		},
		filenames
	};
}

/**
 * @param {import('typescript')} ts
 * @param {import('typescript').CompilerOptions} options
 * @param {SvelteMap} svelte_map
 * @param {string} cwd
 * @returns
 */
async function create_ts_compiler_host(ts, options, svelte_map, cwd) {
	const host = ts.createCompilerHost(options);
	// TypeScript writes the files relative to the found tsconfig/jsconfig
	// which - at least in the case of the tests - is wrong. Therefore prefix
	// the output paths. See Typescript issue #25430 for more.
	const path_prefix = path.relative(process.cwd(), cwd);

	const svelte_sys = {
		...ts.sys,
		/**
		 * @type {import('typescript').System['fileExists']}
		 */
		fileExists(original_path) {
			const path = ensure_real_svelte_filepath(original_path);
			const exists = ts.sys.fileExists(path);
			if (exists && is_svelte_filepath(path)) {
				const is_ts_file = svelte_map.add(path);
				if (
					(is_ts_file && !is_ts_filepath(original_path)) ||
					(!is_ts_file && is_ts_filepath(original_path))
				) {
					return false;
				}
			}
			return exists;
		},
		/**
		 * @type {import('typescript').System['readFile']}
		 */
		readFile(path, encoding = 'utf-8') {
			if (is_virtual_svelte_filepath(path) || is_svelte_filepath(path)) {
				path = ensure_real_svelte_filepath(path);
				return svelte_map.get(path);
			} else {
				return ts.sys.readFile(path, encoding);
			}
		},
		/**
		 * @type {import('typescript').System['readDirectory']}
		 */
		readDirectory(path, extensions, exclude, include, depth) {
			const extensionsWithSvelte = (extensions || []).concat('.svelte');
			return ts.sys.readDirectory(path, extensionsWithSvelte, exclude, include, depth);
		},
		/**
		 * @type {import('typescript').System['writeFile']}
		 */
		writeFile(fileName, data, writeByteOrderMark) {
			return ts.sys.writeFile(path.join(path_prefix, fileName), data, writeByteOrderMark);
		}
	};

	host.fileExists = svelte_sys.fileExists;
	host.readFile = svelte_sys.readFile;
	host.readDirectory = svelte_sys.readDirectory;
	host.writeFile = svelte_sys.writeFile;

	host.resolveModuleNames = (
		module_names,
		containing_file,
		_reused_names,
		_redirected_reference,
		compiler_options
	) => {
		return module_names.map((module_name) => {
			return resolve_module_name(module_name, containing_file, compiler_options);
		});
	};

	/**
	 * @param {string} name
	 * @param {string} containing_file
	 * @param {any} compiler_options
	 */
	function resolve_module_name(name, containing_file, compiler_options) {
		// Delegate to the TS resolver first.
		// If that does not bring up anything, try the Svelte Module loader
		// which is able to deal with .svelte files.
		const ts_resolved_module = ts.resolveModuleName(name, containing_file, compiler_options, ts.sys)
			.resolvedModule;
		if (ts_resolved_module && !is_virtual_svelte_filepath(ts_resolved_module.resolvedFileName)) {
			return ts_resolved_module;
		}

		return ts.resolveModuleName(name, containing_file, compiler_options, svelte_sys).resolvedModule;
	}

	return host;
}

/**
 * @typedef SvelteMap
 * @property {(path: string) => boolean} add
 * @property {(key: string) => string | undefined} get
 */

/**
 * Generates a map to which we add the transformed code of Svelte files
 * early on when we first need to look at the file contents and can read
 * those transformed source later on.
 *
 * @param {import('typescript')} ts
 * @param {import('types/config').ValidatedConfig} config
 * @returns {Promise<SvelteMap>}
 */
async function create_svelte_map(ts, config) {
	const svelte2tsx = await try_load_svelte2tsx();
	const svelte_files = new Map();

	/**
	 * @param {string} path
	 * @returns {boolean} if file is a TS file
	 */
	function add(path) {
		const code = ts.sys.readFile(path, 'utf-8');
		const isTsFile = // svelte-preprocess allows default languages
			['ts', 'typescript'].includes(
				config.preprocess &&
					config.preprocess.defaultLanguages &&
					config.preprocess.defaultLanguages.script
			) || /<script\s+[^>]*?lang=('|")(ts|typescript)('|")/.test(code);
		const transformed = svelte2tsx(code, {
			filename: path,
			isTsFile,
			mode: 'dts'
		}).code;
		svelte_files.set(path, transformed);
		return isTsFile;
	}

	return { add, get: /** @param {string} key */ (key) => svelte_files.get(key) };
}

async function try_load_svelte2tsx() {
	try {
		const svelte2tsx = (await import('svelte2tsx')).svelte2tsx;
		if (!svelte2tsx) {
			throw new Error('Old svelte2tsx version');
		}
		return svelte2tsx;
	} catch (e) {
		throw new Error(
			'You need to install svelte2tsx >=0.4.0 if you want to generate type definitions'
		);
	}
}

/**
 * @param {string} file_path
 * @returns
 */
function is_svelte_filepath(file_path) {
	return file_path.endsWith('.svelte');
}

/**
 * @param {string} file_path
 * @returns
 */
function is_ts_filepath(file_path) {
	return file_path.endsWith('.ts');
}

/**
 * @param {string} file_path
 * @returns
 */
function is_virtual_svelte_filepath(file_path) {
	return file_path.endsWith('.svelte.ts') || file_path.endsWith('svelte.js');
}

/**
 * @param {string} file_path
 * @returns
 */
function to_real_svelte_filepath(file_path) {
	return file_path.slice(0, -3); // -'.js'.length || -'.ts'.length
}

/**
 * @param {string} file_path
 * @returns
 */
function ensure_real_svelte_filepath(file_path) {
	return is_virtual_svelte_filepath(file_path) ? to_real_svelte_filepath(file_path) : file_path;
}

/**
 * @param {string} maybe_parent
 * @param {string} maybe_child
 */
function is_subpath(maybe_parent, maybe_child) {
	const relative = path.relative(maybe_parent, maybe_child);
	return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}
