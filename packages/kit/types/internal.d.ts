import { OutputAsset, OutputChunk } from 'rollup';
import {
	Config,
	ExternalFetch,
	GetSession,
	Handle,
	HandleError,
	Load,
	RequestHandler,
	Server,
	SSRManifest
} from './index';
import {
	HttpMethod,
	JSONObject,
	MaybePromise,
	RequestEvent,
	RequestOptions,
	ResolveOptions,
	ResponseHeaders,
	RouteSegment,
	TrailingSlash
} from './private';

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
}

export type CSRComponent = any; // TODO

export type CSRComponentLoader = () => Promise<CSRComponent>;

export type CSRRoute = {
	id: string;
	exec: (path: string) => undefined | Record<string, string>;
	a: CSRComponentLoader[];
	b: CSRComponentLoader[];
	has_shadow: boolean;
};

export interface EndpointData {
	type: 'endpoint';
	id: string;
	pattern: RegExp;
	file: string;
}

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

export interface Hooks {
	externalFetch: ExternalFetch;
	getSession: GetSession;
	handle: Handle;
	handleError: HandleError;
}

export class InternalServer extends Server {
	respond(
		request: Request,
		options: RequestOptions & {
			prerender?: PrerenderOptions;
		}
	): Promise<Response>;
}

export interface ManifestData {
	assets: Asset[];
	layout: string;
	error: string;
	components: string[];
	routes: RouteData[];
	matchers: Record<string, string>;
}

export interface MethodOverride {
	parameter: string;
	allowed: string[];
}

export type NormalizedLoadOutput = {
	status: number;
	error?: Error;
	redirect?: string;
	props?: Record<string, any> | Promise<Record<string, any>>;
	stuff?: Record<string, any>;
	maxage?: number;
};

export interface PageData {
	type: 'page';
	id: string;
	shadow: string | null;
	pattern: RegExp;
	path: string;
	a: string[];
	b: string[];
}

export type PayloadScriptAttributes =
	| { type: 'data'; url: string; body?: string }
	| { type: 'props' };

export interface PrerenderDependency {
	response: Response;
	body: null | string | Uint8Array;
}

export interface PrerenderOptions {
	fallback?: boolean;
	default: boolean;
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

export type RequiredResolveOptions = Required<ResolveOptions>;

export interface Respond {
	(request: Request, options: SSROptions, state: SSRState): Promise<Response>;
}

export type RouteData = PageData | EndpointData;

export interface ShadowEndpointOutput<Output extends JSONObject = JSONObject> {
	status?: number;
	headers?: Partial<ResponseHeaders>;
	body?: Output;
}

/**
 * The route key of a page with a matching endpoint — used to ensure the
 * client loads data from the right endpoint during client-side navigation
 * rather than a different route that happens to match the path
 */
type ShadowKey = string;

export interface ShadowRequestHandler<Output extends JSONObject = JSONObject> {
	(event: RequestEvent): MaybePromise<ShadowEndpointOutput<Output>>;
}

export interface ShadowData {
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
	id: string;
	pattern: RegExp;
	names: string[];
	types: string[];
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
	id: string;
	pattern: RegExp;
	names: string[];
	types: string[];
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
	fallback?: string;
	getClientAddress: () => string;
	initiator?: SSRPage | null;
	platform?: any;
	prerender?: PrerenderOptions;
}

export type StrictBody = string | Uint8Array;

export type ValidatedConfig = RecursiveRequired<Config>;

export * from './index';
export * from './private';
