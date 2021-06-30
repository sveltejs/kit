import * as path from 'path';

/**
 * @param {import('typescript')} ts
 * @param {import('types/config').ValidatedConfig} config
 */
export async function emit_dts(ts, config) {
	const { options, filenames } = load_tsconfig(ts, config);
	const host = await create_ts_compiler_host(ts, options, config);
	const program = ts.createProgram(filenames, options, host);
	program.emit();
}

/**
 * @param {import('typescript')} ts
 * @param {import('types/config').ValidatedConfig} config
 */
function load_tsconfig(ts, config) {
	const lib_root = config.kit.files.lib;
	let tsconfig_file = ts.findConfigFile(lib_root, ts.sys.fileExists);

	if (!tsconfig_file) {
		throw new Error('Failed to locate tsconfig or jsconfig');
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

	const { options, fileNames: filenames } = ts.parseJsonConfigFileContent(
		ts_config,
		ts.sys,
		basepath,
		{ sourceMap: false },
		tsconfig_file,
		undefined,
		[{ extension: 'svelte', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }]
	);
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
 * @param {import('types/config').ValidatedConfig} config
 * @returns
 */
async function create_ts_compiler_host(ts, options, config) {
	const svelte2tsx = await try_load_svelte2tsx();
	const host = ts.createCompilerHost(options);

	const svelte_sys = {
		...ts.sys,
		/**
		 * @param {string} path
		 */
		fileExists(path) {
			return ts.sys.fileExists(ensure_real_svelte_filepath(path));
		},
		/**
		 * @param {string} path
		 * @param {string} encoding
		 */
		readFile(path, encoding = 'utf-8') {
			if (is_virtual_svelte_filepath(path) || is_svelte_filepath(path)) {
				path = ensure_real_svelte_filepath(path);
				const code = ts.sys.readFile(path, encoding);
				const isTsFile = // svelte-preprocess allows default languages
					['ts', 'typescript'].includes(config.preprocess?.defaultLanguages?.script) ||
					/<script\s+[^>]*?lang=('|")(ts|typescript)('|")/.test(code);
				return svelte2tsx(code, {
					filename: path,
					isTsFile,
					mode: 'dts'
				}).code;
			} else {
				return ts.sys.readFile(path, encoding);
			}
		},
		/**
		 * @param {string} path
		 * @param {string[]} extensions
		 * @param {string[]} exclude
		 * @param {string[]} include
		 * @param {number} depth
		 * @returns
		 */
		readDirectory(path, extensions, exclude, include, depth) {
			const extensionsWithSvelte = (extensions ?? []).concat('.svelte');
			return ts.sys.readDirectory(path, extensionsWithSvelte, exclude, include, depth);
		}
	};

	host.fileExists = svelte_sys.fileExists;
	host.readFile = svelte_sys.readFile;
	host.readDirectory = svelte_sys.readDirectory;

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

		const svelte_resolved_module = ts.resolveModuleName(
			name,
			containing_file,
			compiler_options,
			svelte_sys
		).resolvedModule;
		if (
			!svelte_resolved_module ||
			!is_virtual_svelte_filepath(svelte_resolved_module.resolvedFileName)
		) {
			return svelte_resolved_module;
		}

		return {
			extension: ts.ScriptKind.TSX,
			resolvedFileName: to_real_svelte_filepath(svelte_resolved_module.resolvedFileName)
		};
	}

	return host;
}

async function try_load_svelte2tsx() {
	try {
		return (await import('svelte2tsx')).svelte2tsx;
	} catch (e) {
		throw new Error(
			'You need to install svelte2tsx >=0.3.0 if you want to generate type definitions'
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
function is_virtual_svelte_filepath(file_path) {
	return file_path.endsWith('.svelte.ts');
}

/**
 * @param {string} file_path
 * @returns
 */
function to_real_svelte_filepath(file_path) {
	return file_path.slice(0, -'.ts'.length);
}

/**
 * @param {string} file_path
 * @returns
 */
function ensure_real_svelte_filepath(file_path) {
	return is_virtual_svelte_filepath(file_path) ? to_real_svelte_filepath(file_path) : file_path;
}
