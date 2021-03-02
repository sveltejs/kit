import { CompileOptions, Processed, ResolvedOptions } from './options';
import { compile, preprocess, walk } from 'svelte/compiler';
// @ts-ignore
import { createMakeHot } from 'svelte-hmr';
import { SvelteRequest } from './id';
import { safeBase64Hash } from './hash';
import { log } from './log';

const makeHot = createMakeHot({ walk });

export async function compileSvelte(
	svelteRequest: SvelteRequest,
	code: string,
	options: Partial<ResolvedOptions>
): Promise<CompileData> {
	const { filename, normalizedFilename, cssId, ssr } = svelteRequest;
	const { onwarn, emitCss = true } = options;
	const dependencies = [];
	const finalCompilerOptions: CompileOptions = {
		...options.compilerOptions,
		filename,
		generate: ssr ? 'ssr' : 'dom',
		css: !emitCss,
		hydratable: true
	};
	if (options.hot) {
		const hash = `s-${safeBase64Hash(cssId, 12)}`;
		log.debug(`setting cssHash ${hash} for ${cssId}`);
		finalCompilerOptions.cssHash = () => hash;
	}

	let preprocessed;
	if (options.preprocess) {
		preprocessed = await preprocess(code, options.preprocess, { filename });
		if (preprocessed.dependencies) dependencies.push(...preprocessed.dependencies);
		if (preprocessed.map) finalCompilerOptions.sourcemap = preprocessed.map;
	}

	const compiled = compile(preprocessed ? preprocessed.code : code, finalCompilerOptions);

	(compiled.warnings || []).forEach((warning) => {
		if (!emitCss && warning.code === 'css-unused-selector') return;
		// TODO handle warnings
		if (onwarn) onwarn(warning /*, this.warn*/);
		//else this.warn(warning)
	});

	if (emitCss && compiled.css.code) {
		// TODO properly update sourcemap?
		compiled.js.code += `\nimport ${JSON.stringify(svelteRequest.cssId)};\n`;
	}

	// only apply hmr when not in ssr context and hot options are set
	if (!ssr && options.hot) {
		compiled.js.code = makeHot({
			id: filename,
			compiledCode: compiled.js.code,
			hotOptions: options.hot,
			compiled,
			originalCode: code,
			compileOptions: finalCompilerOptions
		});
	}

	compiled.js.dependencies = dependencies;

	// return everything that was created during preprocess/compile
	const result = {
		filename,
		normalizedFilename,
		cssId,
		code,
		preprocessed,
		compiled,
		compilerOptions: finalCompilerOptions,
		options,
		ssr
	};

	cacheCompileData(result);

	return result;
}

const _cache = new Map<string, CompileData>();
const _ssrCache = new Map<string, CompileData>();

function getCache(ssr: boolean): Map<string, CompileData> {
	return ssr ? _ssrCache : _cache;
}

export function getCompileData(
	svelteRequest: SvelteRequest,
	errorOnMissing = true
): CompileData | undefined {
	const cache = getCache(svelteRequest.ssr);
	const id = svelteRequest.normalizedFilename;
	if (cache.has(id)) {
		return cache.get(id);
	}
	if (errorOnMissing) {
		throw new Error(
			`${id} has no corresponding entry in the ${svelteRequest.ssr ? 'ssr' : ''}cache. ` +
				'This is a @svitejs/vite-plugin-svelte internal error, please open an issue.'
		);
	}
}

function cacheCompileData(compileData: CompileData) {
	const cache = getCache(!!compileData.ssr);
	const id = compileData.normalizedFilename;
	cache.set(id, compileData);
}

export interface Code {
	code: string;
	map?: any;
	dependencies?: any[];
}
export interface Compiled {
	js: Code;
	css: Code;
	ast: any; // TODO type
	warnings: any[]; // TODO type
	vars: Array<{
		name: string;
		export_name: string;
		injected: boolean;
		module: boolean;
		mutated: boolean;
		reassigned: boolean;
		referenced: boolean;
		writable: boolean;
		referenced_from_script: boolean;
	}>;
	stats: {
		timings: {
			total: number;
		};
	};
}

export interface CompileData {
	filename: string;
	normalizedFilename: string;
	cssId: string;
	code: string;
	preprocessed?: Processed;
	compiled: Compiled;
	compilerOptions: CompileOptions;
	options: Partial<ResolvedOptions>;
	ssr: boolean | undefined;
}
