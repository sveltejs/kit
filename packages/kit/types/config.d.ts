import { CompileOptions } from 'svelte/types/compiler/interfaces';
import { UserConfig as ViteConfig } from 'vite';
import { CspDirectives } from './csp';
import { MaybePromise, RecursiveRequired } from './helper';
import { HttpMethod, Logger, RouteSegment, TrailingSlash } from './internal';

export interface RouteDefinition {
	type: 'page' | 'endpoint';
	pattern: RegExp;
	segments: RouteSegment[];
	methods: HttpMethod[];
}

export interface AdapterEntry {
	/**
	 * A string that uniquely identifies an HTTP service (e.g. serverless function) and is used for deduplication.
	 * For example, `/foo/a-[b]` and `/foo/[c]` are different routes, but would both
	 * be represented in a Netlify _redirects file as `/foo/:param`, so they share an ID
	 */
	id: string;

	/**
	 * A function that compares the candidate route with the current route to determine
	 * if it should be treated as a fallback for the current route. For example, `/foo/[c]`
	 * is a fallback for `/foo/a-[b]`, and `/[...catchall]` is a fallback for all routes
	 */
	filter: (route: RouteDefinition) => boolean;

	/**
	 * A function that is invoked once the entry has been created. This is where you
	 * should write the function to the filesystem and generate redirect manifests.
	 */
	complete: (entry: {
		generateManifest: (opts: { relativePath: string; format?: 'esm' | 'cjs' }) => string;
	}) => void;
}

export interface Builder {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;

	appDir: string;
	trailingSlash: 'always' | 'never' | 'ignore';

	/**
	 * Create entry points that map to individual functions
	 * @param fn A function that groups a set of routes into an entry point
	 */
	createEntries(fn: (route: RouteDefinition) => AdapterEntry): void;

	generateManifest: (opts: { relativePath: string; format?: 'esm' | 'cjs' }) => string;

	getBuildDirectory(name: string): string;
	getClientDirectory(): string;
	getServerDirectory(): string;
	getStaticDirectory(): string;

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
	headers?: {
		host?: string;
		protocol?: string;
	};
	adapt(builder: Builder): Promise<void>;
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
	compilerOptions?: CompileOptions;
	extensions?: string[];
	kit?: {
		adapter?: Adapter;
		amp?: boolean;
		appDir?: string;
		browser?: {
			hydrate?: boolean;
			router?: boolean;
		};
		csp?: {
			mode?: 'hash' | 'nonce' | 'auto';
			directives?: CspDirectives;
		};
		files?: {
			assets?: string;
			hooks?: string;
			lib?: string;
			routes?: string;
			serviceWorker?: string;
			template?: string;
		};
		floc?: boolean;
		inlineStyleThreshold?: number;
		methodOverride?: {
			parameter?: string;
			allowed?: string[];
		};
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
			concurrency?: number;
			crawl?: boolean;
			enabled?: boolean;
			entries?: string[];
			onError?: PrerenderOnErrorValue;
		};
		routes?: (filepath: string) => boolean;
		serviceWorker?: {
			register?: boolean;
			files?: (filepath: string) => boolean;
		};
		trailingSlash?: TrailingSlash;
		version?: {
			name?: string;
			pollInterval?: number;
		};
		vite?: ViteConfig | (() => MaybePromise<ViteConfig>);
	};
	preprocess?: any;
}

export type ValidatedConfig = RecursiveRequired<Config>;
