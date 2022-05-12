/// <reference types="svelte" />
/// <reference types="vite/client" />

import './ambient';

import { CompileOptions } from 'svelte/types/compiler/interfaces';
import {
	AdapterEntry,
	CspDirectives,
	JSONValue,
	Logger,
	MaybePromise,
	Prerendered,
	PrerenderOnErrorValue,
	RequestEvent,
	RequestOptions,
	ResolveOptions,
	ResponseHeaders,
	RouteDefinition,
	TrailingSlash
} from './private';
import { SSRNodeLoader, SSRRoute, ValidatedConfig } from './internal';

export interface Adapter {
	name: string;
	adapt(builder: Builder): MaybePromise<void>;
}

export interface Builder {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;

	config: ValidatedConfig;
	prerendered: Prerendered;

	/**
	 * Create entry points that map to individual functions
	 * @param fn A function that groups a set of routes into an entry point
	 */
	createEntries(fn: (route: RouteDefinition) => AdapterEntry): Promise<void>;

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
	 *
	 * @param dest
	 */
	writePrerendered(
		dest: string,
		opts?: {
			fallback?: string;
		}
	): string[];
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
}

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
		endpointExtensions?: string[];
		files?: {
			assets?: string;
			hooks?: string;
			lib?: string;
			params?: string;
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
		outDir?: string;
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
			default?: boolean;
			enabled?: boolean;
			entries?: Array<'*' | `/${string}`>;
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
		vite?: import('vite').UserConfig | (() => MaybePromise<import('vite').UserConfig>);
	};
	preprocess?: any;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}

export interface GetSession {
	(event: RequestEvent): MaybePromise<App.Session>;
}

export interface Handle {
	(input: {
		event: RequestEvent;
		resolve(event: RequestEvent, opts?: ResolveOptions): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleError {
	(input: { error: Error & { frame?: string }; event: RequestEvent }): void;
}

/**
 * The `(input: LoadInput) => LoadOutput` `load` function exported from `<script context="module">` in a page or layout.
 *
 * Note that you can use [generated types](/docs/types#generated-types) instead of manually specifying the Params generic argument.
 */
export interface Load<
	Params extends Record<string, string> = Record<string, string>,
	InputProps extends Record<string, any> = Record<string, any>,
	OutputProps extends Record<string, any> = InputProps
> {
	(input: LoadInput<Params, InputProps>): MaybePromise<LoadOutput<OutputProps>>;
}

export interface LoadInput<
	Params extends Record<string, string> = Record<string, string>,
	Props extends Record<string, any> = Record<string, any>
> {
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	params: Params;
	props: Props;
	routeId: string | null;
	session: App.Session;
	stuff: Partial<App.Stuff>;
	url: URL;
	status: number | null;
	error: Error | null;
}

export interface LoadOutput<Props extends Record<string, any> = Record<string, any>> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	stuff?: Partial<App.Stuff>;
	cache?: LoadOutputCache;
	dependencies?: string[];
}

export interface LoadOutputCache {
	maxage: number;
	private?: boolean;
}

export interface Navigation {
	from: URL;
	to: URL;
}

export interface Page<Params extends Record<string, string> = Record<string, string>> {
	url: URL;
	params: Params;
	routeId: string | null;
	stuff: App.Stuff;
	status: number;
	error: Error | null;
}

export interface ParamMatcher {
	(param: string): boolean;
}

/**
 * A `(event: RequestEvent) => RequestHandlerOutput` function exported from an endpoint that corresponds to an HTTP verb (`get`, `put`, `patch`, etc) and handles requests with that method. Note that since 'delete' is a reserved word in JavaScript, delete handles are called `del` instead.
 *
 * Note that you can use [generated types](/docs/types#generated-types) instead of manually specifying the `Params` generic argument.
 */
export interface RequestHandler<
	Params extends Record<string, string> = Record<string, string>,
	Output extends ResponseBody = ResponseBody
> {
	(event: RequestEvent<Params>): MaybePromise<RequestHandlerOutput<Output>>;
}

export interface RequestHandlerOutput<Output extends ResponseBody = ResponseBody> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Output;
}

export type ResponseBody = JSONValue | Uint8Array | ReadableStream | import('stream').Readable;

export class Server {
	constructor(manifest: SSRManifest);
	respond(request: Request, options: RequestOptions): Promise<Response>;
}

export interface SSRManifest {
	appDir: string;
	assets: Set<string>;
	mimeTypes: Record<string, string>;

	/** private fields */
	_: {
		entry: {
			file: string;
			js: string[];
			css: string[];
		};
		nodes: SSRNodeLoader[];
		routes: SSRRoute[];
		matchers: () => Promise<Record<string, ParamMatcher>>;
	};
}
