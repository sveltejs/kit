/// <reference types="svelte" />
/// <reference types="vite/client" />

import './ambient.js';

import { CompileOptions } from 'svelte/types/compiler/interfaces';
import {
	AdapterEntry,
	CspDirectives,
	Logger,
	MaybePromise,
	Prerendered,
	PrerenderOnErrorValue,
	RequestOptions,
	ResponseHeaders,
	RouteDefinition,
	TrailingSlash
} from './private.js';
import { SSRNodeLoader, SSRRoute, ValidatedConfig } from './internal.js';
import { HttpError, Redirect } from '../src/index/private.js';

export interface Adapter {
	name: string;
	adapt(builder: Builder): MaybePromise<void>;
}

export type AwaitedProperties<input extends Record<string, any> | void> = input extends void
	? undefined // needs to be undefined, because void will break intellisense
	: input extends Record<string, any>
	? {
			[key in keyof input]: Awaited<input[key]>;
	  }
	: {} extends input // handles the any case
	? input
	: unknown;

export type AwaitedErrors<T extends (...args: any) => any> = Awaited<ReturnType<T>> extends {
	errors?: any;
}
	? Awaited<ReturnType<T>>['errors']
	: undefined;

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

	/**
	 * @param {string} directory Path to the directory containing the files to be compressed
	 */
	compress(directory: string): void;
}

export interface Config {
	compilerOptions?: CompileOptions;
	extensions?: string[];
	kit?: KitConfig;
	package?: {
		source?: string;
		dir?: string;
		emitTypes?: boolean;
		exports?: (filepath: string) => boolean;
		files?: (filepath: string) => boolean;
	};
	preprocess?: any;
	[key: string]: any;
}

export interface KitConfig {
	adapter?: Adapter;
	alias?: Record<string, string>;
	appDir?: string;
	browser?: {
		hydrate?: boolean;
		router?: boolean;
	};
	csp?: {
		mode?: 'hash' | 'nonce' | 'auto';
		directives?: CspDirectives;
		reportOnly?: CspDirectives;
	};
	env?: {
		dir?: string;
		publicPrefix?: string;
	};
	moduleExtensions?: string[];
	files?: {
		assets?: string;
		hooks?: string;
		lib?: string;
		params?: string;
		routes?: string;
		serviceWorker?: string;
		template?: string;
	};
	inlineStyleThreshold?: number;
	methodOverride?: {
		parameter?: string;
		allowed?: string[];
	};
	outDir?: string;
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
		origin?: string;
	};
	serviceWorker?: {
		register?: boolean;
		files?: (filepath: string) => boolean;
	};
	trailingSlash?: TrailingSlash;
	version?: {
		name?: string;
		pollInterval?: number;
	};
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
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
 * The generic form of `PageLoad` and `LayoutLoad`. You should import those from `./$types` (see [generated types](https://kit.svelte.dev/docs/types#generated-types))
 * rather than using `Load` directly.
 */
export interface Load<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	InputData extends Record<string, any> | null = Record<string, any> | null,
	ParentData extends Record<string, any> = Record<string, any>,
	OutputData extends Record<string, any> | void = Record<string, any> | void
> {
	(event: LoadEvent<Params, InputData, ParentData>): MaybePromise<OutputData>;
}

export interface LoadEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	Data extends Record<string, any> | null = Record<string, any> | null,
	ParentData extends Record<string, any> = Record<string, any>
> {
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	params: Params;
	data: Data;
	routeId: string | null;
	setHeaders: (headers: ResponseHeaders) => void;
	url: URL;
	parent: () => Promise<ParentData>;
	depends: (...deps: string[]) => void;
}

export interface Navigation {
	from: URL;
	to: URL;
}

export interface Page<Params extends Record<string, string> = Record<string, string>> {
	url: URL;
	params: Params;
	routeId: string | null;
	status: number;
	error: HttpError | Error | null;
	data: Record<string, any>;
}

export interface ParamMatcher {
	(param: string): boolean;
}

export interface RequestEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>
> {
	clientAddress: string;
	locals: App.Locals;
	params: Params;
	platform: Readonly<App.Platform>;
	request: Request;
	routeId: string | null;
	setHeaders: (headers: ResponseHeaders) => void;
	url: URL;
}

/**
 * A `(event: RequestEvent) => Response` function exported from a `+server.js` file that corresponds to an HTTP verb (`GET`, `PUT`, `PATCH`, etc) and handles requests with that method.
 *
 * It receives `Params` as the first generic argument, which you can skip by using [generated types](/docs/types#generated-types) instead.
 */
export interface RequestHandler<Params extends Record<string, string> = Record<string, string>> {
	(event: RequestEvent<Params>): MaybePromise<Response>;
}

export interface ResolveOptions {
	ssr?: boolean;
	transformPageChunk?: (input: { html: string; done: boolean }) => MaybePromise<string | undefined>;
}

export class Server {
	constructor(manifest: SSRManifest);
	init(options: ServerInitOptions): Promise<void>;
	respond(request: Request, options: RequestOptions): Promise<Response>;
}

export interface ServerInitOptions {
	env: Record<string, string>;
}

export interface SSRManifest {
	appDir: string;
	assets: Set<string>;
	mimeTypes: Record<string, string>;

	/** private fields */
	_: {
		entry: {
			file: string;
			imports: string[];
			stylesheets: string[];
		};
		nodes: SSRNodeLoader[];
		routes: SSRRoute[];
		matchers: () => Promise<Record<string, ParamMatcher>>;
	};
}

/**
 * The generic form of `PageServerLoad` and `LayoutServerLoad`. You should import those from `./$types` (see [generated types](https://kit.svelte.dev/docs/types#generated-types))
 * rather than using `ServerLoad` directly.
 */
export interface ServerLoad<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	ParentData extends Record<string, any> = Record<string, any>,
	OutputData extends Record<string, any> | void = Record<string, any> | void
> {
	(event: ServerLoadEvent<Params, ParentData>): MaybePromise<OutputData>;
}

export interface ServerLoadEvent<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>,
	ParentData extends Record<string, any> = Record<string, any>
> extends RequestEvent<Params> {
	parent: () => Promise<ParentData>;
}

export interface Action<
	Params extends Partial<Record<string, string>> = Partial<Record<string, string>>
> {
	(event: RequestEvent<Params>): MaybePromise<
		| { status?: number; errors: Record<string, any>; location?: never }
		| { status?: never; errors?: never; location: string }
		| void
	>;
}

// TODO figure out how to just re-export from '../src/index/index.js' without
// breaking the site

/**
 * Creates an `HttpError` object with an HTTP status code and an optional message.
 * This object, if thrown during request handling, will cause SvelteKit to
 * return an error response without invoking `handleError`
 * @param {number} status
 * @param {string | undefined} [message]
 */
export function error(status: number, message?: string | undefined): HttpError;

/**
 * Creates a `Redirect` object. If thrown during request handling, SvelteKit will
 * return a redirect response.
 */
export function redirect(status: number, location: string): Redirect;

/**
 * Generates a JSON `Response` object from the supplied data.
 */
export function json(data: any, init?: ResponseInit): Response;
