import { ResolvedConfig } from 'vite';
import { log } from './log';
import { loadSvelteConfig } from './loadSvelteConfig';

const defaultOptions: Partial<Options> = {
	extensions: ['.svelte'],
	emitCss: true,
	compilerOptions: {
		css: false
	}
};

const knownOptions = new Set([
	'include',
	'exclude',
	'extensions',
	'emitCss',
	'compilerOptions',
	'preprocess',
	'hot'
]);

export function buildInitialOptions(rawOptions: Options): Options {
	const options = {
		...defaultOptions,
		...rawOptions
	};
	const compilerOptions = options.compilerOptions;

	compilerOptions.format = 'esm';

	const invalidKeys = Object.keys(rawOptions || {}).filter((key) => !knownOptions.has(key));
	if (invalidKeys.length) {
		log.warn(`invalid plugin options "${invalidKeys.join(', ')}" in config`, rawOptions);
	}

	return options;
}

export function resolveOptions(options: Options, config: ResolvedConfig): ResolvedOptions {
	const svelteConfig = loadSvelteConfig(config.root);
	const resolvedOptions = {
		...svelteConfig,
		...options,
		root: config.root,
		isProduction: config.isProduction,
		isBuild: config.command === 'build',
		isServe: config.command === 'serve'
	};
	const compilerOptions = resolvedOptions.compilerOptions;
	if (config.isProduction) {
		resolvedOptions.hot = false;
		resolvedOptions.emitCss = true;
		compilerOptions.dev = false;
	}

	if (resolvedOptions.hot) {
		compilerOptions.dev = true;
		resolvedOptions.hot = {
			...resolvedOptions.hot,
			absoluteImports: false,
			injectCss: !resolvedOptions.emitCss
		};
	} else {
		compilerOptions.dev = !config.isProduction;
	}
	compilerOptions.css = !resolvedOptions.emitCss;

	log.debug('resolved options', resolvedOptions);
	return resolvedOptions;
}

export interface Options {
	/** One or more minimatch patterns */
	include: Arrayable<string>;

	/** One or more minimatch patterns */
	exclude: Arrayable<string>;

	/**
	 * By default, all ".svelte" files are compiled
	 * @default ['.svelte']
	 */
	extensions: string[];

	/**
	 * Optionally, preprocess components with svelte.preprocess:
	 * \@see https://svelte.dev/docs#svelte_preprocess
	 */
	preprocess: Arrayable<PreprocessorGroup>;

	/** Emit Svelte styles as virtual CSS files for other plugins to process. */
	emitCss: boolean;

	/** Options passed to `svelte.compile` method. */
	compilerOptions: Partial<CompileOptions>;

	onwarn?: undefined | false | ((warning: any, defaultHandler?: any) => void);

	/** Enable/configure HMR */
	hot?:
		| undefined
		| false
		| {
				/**
				 * Enable state preservation when a component is updated by HMR for every
				 * components.
				 * @default false
				 */
				preserveState: boolean;

				/**
				 * If this string appears anywhere in your component's code, then local
				 * state won't be preserved, even when noPreserveState is false.
				 * @default '\@hmr:reset'
				 */
				noPreserveStateKey: string;

				/**
				 * If this string appears next to a `let` variable, the value of this
				 * variable will be preserved accross HMR updates.
				 * @default '\@hmr:keep'
				 */
				preserveStateKey: string;

				/**
				 * Prevent doing a full reload on next HMR update after fatal error.
				 * @default false
				 */
				noReload: boolean;

				/**
				 * Try to recover after runtime errors in component init.
				 * @default true
				 */
				optimistic: boolean;

				noDisableCss: boolean;
				injectCss?: boolean;
				cssEjectDelay: number;
				absoluteImports: boolean;
		  };
	/**
	 * disable separate hmr update for css files via vite
	 */
	disableCssHmr?: boolean;

	/**
	 * use transform cache even for ssr request (might cause stale modules)
	 */
	useTransformCacheForSSR?: boolean;
}

export interface ResolvedOptions extends Options {
	root: string;
	isProduction: boolean;
	isBuild?: boolean;
	isServe?: boolean;
}

// TODO import from appropriate places
export declare type ModuleFormat = 'esm' | 'cjs';

export interface CompileOptions {
	format?: ModuleFormat;
	name?: string;
	filename?: string;
	generate?: 'dom' | 'ssr' | false;
	sourcemap?: object | string;
	outputFilename?: string;
	cssOutputFilename?: string;
	sveltePath?: string;
	dev?: boolean;
	accessors?: boolean;
	immutable?: boolean;
	hydratable?: boolean;
	legacy?: boolean;
	customElement?: boolean;
	tag?: string;
	css?: boolean;
	loopGuardTimeout?: number;
	namespace?: string;
	preserveComments?: boolean;
	preserveWhitespace?: boolean;
	cssHash?: CssHashGetter;
}

export interface Processed {
	code: string;
	map?: string | object;
	dependencies?: string[];
	toString?: () => string;
}

export declare type CssHashGetter = (args: {
	name: string;
	filename: string | undefined;
	css: string;
	hash: (input: string) => string;
}) => string;

export declare type MarkupPreprocessor = (options: {
	content: string;
	filename: string;
}) => Processed | Promise<Processed>;

export declare type Preprocessor = (options: {
	content: string;
	attributes: Record<string, string | boolean>;
	filename?: string;
}) => Processed | Promise<Processed>;

export interface PreprocessorGroup {
	markup?: MarkupPreprocessor;
	style?: Preprocessor;
	script?: Preprocessor;
}

export type Arrayable<T> = T | T[];
