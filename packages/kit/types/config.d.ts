import { UserConfig as ViteConfig } from 'vite';
import { RecursiveRequired } from './helper';
import { HttpMethod, Logger, RouteSegment, TrailingSlash } from './internal';

export interface RouteDefinition {
	type: 'page' | 'endpoint';
	pattern: RegExp;
	segments: RouteSegment[];
	methods: HttpMethod[];
}

export interface AdapterEntryConfig<Data = any> {
	id: string;
	data: Data;
	filter: (route: RouteDefinition) => boolean;
}

export interface AdapterEntry<Data = any> {
	id: string;
	data: Data;
	generateManifest: (opts: { relativePath: string }) => string;
}

export interface AdapterUtils {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;

	/**
	 * Create entry points that map to individual functions
	 * @param fn TODO explain this
	 */
	createEntries<Data>(
		fn: (route: RouteDefinition) => AdapterEntryConfig<Data>
	): Array<AdapterEntry<Data>>;

	generateManifest: (opts: { relativePath: string }) => string;

	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeClient(dest: string): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeServer(dest: string): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeStatic(dest: string): string[];
	/**
	 * @param from the source file or folder
	 * @param to the destination file or folder
	 * @param opts.filter a function to determine whether a file or folder should be copied
	 * @param opts.replace a map of strings to replace
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy(
		from: string,
		to: string,
		opts?: {
			filter?: (basename: string) => boolean;
			replace?: Record<string, string>;
		}
	): string[];

	prerender(options: { all?: boolean; dest: string; fallback?: string }): Promise<{
		paths: string[];
	}>;
}

export interface Adapter {
	name: string;
	adapt(utils: AdapterUtils): Promise<void>;
}

export interface PrerenderErrorHandler {
	(details: {
		status: number;
		path: string;
		referrer: string | null;
		referenceType: 'linked' | 'fetched';
	}): void;
}

export type PrerenderOnErrorValue = 'fail' | 'continue' | PrerenderErrorHandler;

export interface Config {
	compilerOptions?: any;
	extensions?: string[];
	kit?: {
		adapter?: Adapter;
		amp?: boolean;
		appDir?: string;
		files?: {
			assets?: string;
			hooks?: string;
			lib?: string;
			routes?: string;
			serviceWorker?: string;
			template?: string;
		};
		floc?: boolean;
		host?: string;
		hostHeader?: string;
		hydrate?: boolean;
		package?: {
			dir?: string;
			emitTypes?: boolean;
			exports?(filepath: string): boolean;
			files?(filepath: string): boolean;
		};
		paths?: {
			assets?: string;
			base?: string;
		};
		prerender?: {
			crawl?: boolean;
			enabled?: boolean;
			entries?: string[];
			onError?: PrerenderOnErrorValue;
		};
		router?: boolean;
		serviceWorker?: {
			files?(filepath: string): boolean;
		};
		ssr?: boolean;
		target?: string;
		trailingSlash?: TrailingSlash;
		vite?: ViteConfig | (() => ViteConfig);
	};
	preprocess?: any;
}

export type ValidatedConfig = RecursiveRequired<Config>;
