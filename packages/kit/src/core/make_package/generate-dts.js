import * as path from 'path';
import { createRequire } from 'module';

// require.resolve-equivalent in ESM is still experimental, therefore create require here
const require = createRequire(import.meta.url);

/**
 * @param {import('typescript')} ts
 * @param {import('types/config').ValidatedConfig} config
 */
export async function emitDts(ts, config) {
	const { options, filenames } = loadTsconfig(ts, config.kit.package.dir);
	const host = await createTsCompilerHost(ts, options, config);
	const program = ts.createProgram(filenames, options, host);
	program.emit();
}

/**
 * @param {import('typescript')} ts
 * @param {string} output_dir
 */
function loadTsconfig(ts, output_dir) {
	let tsconfigFile = ts.findConfigFile(output_dir, ts.sys.fileExists);

	if (!tsconfigFile) {
		throw new Error('Failed to locate tsconfig or jsconfig');
	}

	tsconfigFile = path.isAbsolute(tsconfigFile) ? tsconfigFile : path.join(output_dir, tsconfigFile);
	const basePath = path.dirname(tsconfigFile);
	const { error, config } = ts.readConfigFile(tsconfigFile, ts.sys.readFile);

	if (error) {
		throw new Error('Malformed tsconfig');
	}

	const { options, fileNames: filenames } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		basePath,
		{ sourceMap: false },
		tsconfigFile,
		undefined,
		[{ extension: 'svelte', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }]
	);
	return {
		options: {
			...options,
			declaration: true,
			emitDeclarationOnly: true,
			declarationDir: path.join(output_dir, 'types'),
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
async function createTsCompilerHost(ts, options, config) {
	const svelte2tsx = await try_load_svelte2tsx();
	const shims_path = require.resolve('svelte2tsx/svelte-shims.d.ts');
	let shims = ts.sys.readFile(shims_path);
	// Remove the "declare module 'svelte'" part
	shims = shims.substr(shims.indexOf('}') + 1);

	const host = ts.createCompilerHost(options);

	const svelteSys = {
		...ts.sys,
		/**
		 * @param {string} path
		 */
		fileExists(path) {
			return ts.sys.fileExists(ensureRealSvelteFilePath(path));
		},
		/**
		 * @param {string} path
		 * @param {string} encoding
		 */
		readFile(path, encoding = 'utf-8') {
			if (isVirtualSvelteFilePath(path) || isSvelteFilePath(path)) {
				const svelteFileName = ensureRealSvelteFilePath(path);
				const svelteCode = ts.sys.readFile(svelteFileName, encoding);
				const isTsFile = // svelte-preprocess allows default languages
					['ts', 'typescript'].includes(config.preprocess?.defaultLanguages?.script) ||
					/<script\s+[^>]*?lang=('|")(ts|typescript)('|")/.test(svelteCode);
				const tsx = svelte2tsx(svelteCode, {
					filename: svelteFileName,
					isTsFile
				});
				return postprocessTSX(tsx.code, shims);
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

	host.fileExists = svelteSys.fileExists;
	host.readFile = svelteSys.readFile;
	host.readDirectory = svelteSys.readDirectory;

	host.resolveModuleNames = (
		moduleNames,
		containingFile,
		_reusedNames,
		_redirectedReference,
		compilerOptions
	) => {
		return moduleNames.map((moduleName) => {
			const resolvedModule = resolveModuleName(moduleName, containingFile, compilerOptions);
			return resolvedModule;
		});
	};

	/**
	 * @param {string} name
	 * @param {string} containingFile
	 * @param {any} compilerOptions
	 */
	function resolveModuleName(name, containingFile, compilerOptions) {
		// Delegate to the TS resolver first.
		// If that does not bring up anything, try the Svelte Module loader
		// which is able to deal with .svelte files.
		const tsResolvedModule = ts.resolveModuleName(name, containingFile, compilerOptions, ts.sys)
			.resolvedModule;
		if (tsResolvedModule && !isVirtualSvelteFilePath(tsResolvedModule.resolvedFileName)) {
			return tsResolvedModule;
		}

		const svelteResolvedModule = ts.resolveModuleName(
			name,
			containingFile,
			compilerOptions,
			svelteSys
		).resolvedModule;
		if (!svelteResolvedModule || !isVirtualSvelteFilePath(svelteResolvedModule.resolvedFileName)) {
			return svelteResolvedModule;
		}

		const resolvedFileName = toRealSvelteFilePath(svelteResolvedModule.resolvedFileName);

		const resolvedSvelteModule = {
			extension: ts.ScriptKind.TSX,
			resolvedFileName
		};
		return resolvedSvelteModule;
	}

	return host;
}

/**
 * @param {string} code
 * @param {string} shims
 */
function postprocessTSX(code, shims) {
	// Removes the tsx code that was transformed from the htmlx code.
	// It's unnecessary here and it makes the propDef emit the wrong type (don't know why)
	// TODO: this logic should probably belong into svelte2tsx and become a output option
	code =
		code.substr(0, code.indexOf('\n() => (<>')).replace('<></>;', '') +
		code.substr(code.lastIndexOf('</>);') + '</>);'.length);

	const COMPONENT_SUFFIX = '__SvelteComponent_';
	const regex = new RegExp(
		`export default class (?<componentName>.+)${COMPONENT_SUFFIX}` +
			` extends createSvelte2TsxComponent\\((?<propDef>.+)\\)`
	);
	const match = code.match(regex);
	if (match && match.groups) {
		const { componentName, propDef } = match.groups;
		const oldComponentExport = match[0];
		const newComponentExport =
			`export default class ${componentName} extends SvelteComponentTyped` +
			`<${componentName}Props, ${componentName}Events, ${componentName}Slots>`;
		return (
			`import { SvelteComponentTyped } from 'svelte';` +
			// The component def contains some references to the (in language tools) globally defined
			// shims. Include them here so types can be resolved within the same file
			`${shims}\n` +
			code.replace(oldComponentExport, newComponentExport) +
			`const propDef = ${propDef};` +
			`export type ${componentName}Props = typeof propDef.props;` +
			`export type ${componentName}Events = typeof propDef.events;` +
			`export type ${componentName}Slots = typeof propDef.slots;`
		);
	}
	return code;
}

async function try_load_svelte2tsx() {
	try {
		return (await import('svelte2tsx')).default;
	} catch (e) {
		throw new Error('You need to install svelte2tsx if you want to generate type definitions');
	}
}

/**
 * @param {string} filePath
 * @returns
 */
function isSvelteFilePath(filePath) {
	return filePath.endsWith('.svelte');
}

/**
 * @param {string} filePath
 * @returns
 */
function isVirtualSvelteFilePath(filePath) {
	return filePath.endsWith('.svelte.ts');
}

/**
 * @param {string} filePath
 * @returns
 */
function toRealSvelteFilePath(filePath) {
	return filePath.slice(0, -'.ts'.length);
}

/**
 * @param {string} filePath
 * @returns
 */
function ensureRealSvelteFilePath(filePath) {
	return isVirtualSvelteFilePath(filePath) ? toRealSvelteFilePath(filePath) : filePath;
}
