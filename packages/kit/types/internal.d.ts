import { OutputAsset, OutputChunk } from 'rollup';
import {
	SSRManifest,
	ValidatedConfig,
	RequestHandler,
	Load,
	ExternalFetch,
	GetSession,
	Handle,
	HandleError,
	RequestEvent,
	RequestOptions,
	PrerenderErrorHandler,
	Server
} from './index';

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

export interface ServerModule {
	Server: typeof InternalServer;

	override(options: {
		paths: {
			base: string;
			assets: string;
		};
		prerendering: boolean;
		protocol?: 'http' | 'https';
		read(file: string): Buffer;
	}): void;
}

export interface Asset {
	file: string;
	size: number;
	type: string | null;
}

export type Body = JSONValue | Uint8Array | ReadableStream | import('stream').Readable;

export interface BuildData {
	app_dir: string;
	manifest_data: ManifestData;
	service_worker: string | null;
	client: {
		assets: OutputAsset[];
		chunks: OutputChunk[];
		entry: {
			file: string;
			js: string[];
			css: string[];
		};
		vite_manifest: import('vite').Manifest;
	};
	server: {
		chunks: OutputChunk[];
		methods: Record<string, HttpMethod[]>;
		vite_manifest: import('vite').Manifest;
	};
	static: string[];
	entries: string[];
}

export type CSRComponent = any; // TODO

export type CSRComponentLoader = () => Promise<CSRComponent>;

export type CSRRoute = [RegExp, CSRComponentLoader[], CSRComponentLoader[], GetParams?, HasShadow?];

export type Either<T, U> = Only<T, U> | Only<U, T>;

export interface EndpointData {
	type: 'endpoint';
	key: string;
	segments: RouteSegment[];
	pattern: RegExp;
	params: string[];
	file: string;
}

export interface Fallthrough {
	fallthrough: true;
}

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

type HasShadow = 1;

export interface Hooks {
	externalFetch: ExternalFetch;
	getSession: GetSession;
	handle: Handle;
	handleError: HandleError;
}

export type HttpMethod = 'get' | 'head' | 'post' | 'put' | 'delete' | 'patch';

export class InternalServer extends Server {
	respond(
		request: Request,
		options?: RequestOptions & {
			prerender?: PrerenderOptions;
		}
	): Promise<Response>;
}

export type JSONObject = { [key: string]: JSONValue };

export type JSONValue = string | number | boolean | null | ToJSON | JSONValue[] | JSONObject;

export interface Logger {
	(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
	warn(msg: string): void;
	minor(msg: string): void;
	info(msg: string): void;
}

export interface ManifestData {
	assets: Asset[];
	layout: string;
	error: string;
	components: string[];
	routes: RouteData[];
}

export type MaybePromise<T> = T | Promise<T>;

export interface MethodOverride {
	parameter: string;
	allowed: string[];
}

export type NormalizedLoadOutput = Either<
	{
		status: number;
		error?: Error;
		redirect?: string;
		props?: Record<string, any> | Promise<Record<string, any>>;
		stuff?: Record<string, any>;
		maxage?: number;
	},
	Fallthrough
>;

type Only<T, U> = { [P in keyof T]: T[P] } & { [P in Exclude<keyof U, keyof T>]?: never };

export interface PageData {
	type: 'page';
	key: string;
	shadow: string | null;
	segments: RouteSegment[];
	pattern: RegExp;
	params: string[];
	path: string;
	a: string[];
	b: string[];
}

export interface PrerenderDependency {
	response: Response;
	body: null | string | Uint8Array;
}

export type PrerenderOnErrorValue = 'fail' | 'continue' | PrerenderErrorHandler;

export interface PrerenderOptions {
	fallback?: string;
	all: boolean;
	dependencies: Map<string, PrerenderDependency>;
}

export type RecursiveRequired<T> = {
	// Recursive implementation of TypeScript's Required utility type.
	// Will recursively continue until it reaches primitive or union
	// with a Function in it, except those commented below
	[K in keyof T]-?: Extract<T[K], Function> extends never // If it does not have a Function type
		? RecursiveRequired<T[K]> // recursively continue through.
		: K extends 'vite' // If it reaches the 'vite' key
		? Extract<T[K], Function> // only take the Function type.
		: T[K]; // Use the exact type for everything else
};

export interface RequiredResolveOptions {
	ssr: boolean;
	transformPage: ({ html }: { html: string }) => MaybePromise<string>;
}

export interface Respond {
	(request: Request, options: SSROptions, state?: SSRState): Promise<Response>;
}

/** `string[]` is only for set-cookie, everything else must be type of `string` */
export type ResponseHeaders = Record<string, string | number | string[]>;

export type RouteData = PageData | EndpointData;

export interface RouteDefinition {
	type: 'page' | 'endpoint';
	pattern: RegExp;
	segments: RouteSegment[];
	methods: HttpMethod[];
}

export interface RouteSegment {
	content: string;
	dynamic: boolean;
	rest: boolean;
}

export interface ShadowEndpointOutput<Output extends JSONObject = JSONObject> {
	status?: number;
	headers?: Partial<ResponseHeaders>;
	body?: Output;
}

export interface ShadowRequestHandler<Output extends JSONObject = JSONObject> {
	(event: RequestEvent): MaybePromise<Either<ShadowEndpointOutput<Output>, Fallthrough>>;
}

export interface ShadowData {
	fallthrough?: boolean;
	status?: number;
	error?: Error;
	redirect?: string;
	cookies?: string[];
	body?: JSONObject;
}

export interface SSRComponent {
	router?: boolean;
	hydrate?: boolean;
	prerender?: boolean;
	load: Load;
	default: {
		render(props: Record<string, any>): {
			html: string;
			head: string;
			css: {
				code: string;
				map: any; // TODO
			};
		};
	};
}

export type SSRComponentLoader = () => Promise<SSRComponent>;

export interface SSREndpoint {
	type: 'endpoint';
	pattern: RegExp;
	params: GetParams;
	load(): Promise<{
		[method: string]: RequestHandler;
	}>;
}

export interface SSRNode {
	module: SSRComponent;
	/** client-side module URL for this component */
	entry: string;
	/** external CSS files */
	css: string[];
	/** external JS files */
	js: string[];
	/** inlined styles */
	styles?: Record<string, string>;
}

export type SSRNodeLoader = () => Promise<SSRNode>;

export interface SSROptions {
	amp: boolean;
	csp: ValidatedConfig['kit']['csp'];
	dev: boolean;
	floc: boolean;
	get_stack: (error: Error) => string | undefined;
	handle_error(error: Error & { frame?: string }, event: RequestEvent): void;
	hooks: Hooks;
	hydrate: boolean;
	manifest: SSRManifest;
	method_override: MethodOverride;
	paths: {
		base: string;
		assets: string;
	};
	prefix: string;
	prerender: boolean;
	read(file: string): Buffer;
	root: SSRComponent['default'];
	router: boolean;
	service_worker?: string;
	template({
		head,
		body,
		assets,
		nonce
	}: {
		head: string;
		body: string;
		assets: string;
		nonce: string;
	}): string;
	template_contains_nonce: boolean;
	trailing_slash: TrailingSlash;
}

export interface SSRPage {
	type: 'page';
	pattern: RegExp;
	params: GetParams;
	shadow:
		| null
		| (() => Promise<{
				[method: string]: ShadowRequestHandler;
		  }>);
	/**
	 * plan a is to render 1 or more layout components followed by a leaf component.
	 */
	a: number[];
	/**
	 * plan b — if one of them components fails in `load` we backtrack until we find
	 * the nearest error component.
	 */
	b: number[];
}

export interface SSRPagePart {
	id: string;
	load: SSRComponentLoader;
}

export type SSRRoute = SSREndpoint | SSRPage;

export interface SSRState {
	fetched?: string;
	initiator?: SSRPage | null;
	platform?: any;
	prerender?: PrerenderOptions;
	fallback?: string;
}

export type StrictBody = string | Uint8Array;

type ToJSON = { toJSON(...args: any[]): Exclude<JSONValue, ToJSON> };

export type TrailingSlash = 'never' | 'always' | 'ignore';

export * from './index';
