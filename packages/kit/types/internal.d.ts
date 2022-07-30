import { OutputAsset, OutputChunk } from 'rollup';
import {
	Config,
	ExternalFetch,
	GetSession,
	Handle,
	HandleError,
	KitConfig,
	Load,
	RequestEvent,
	RequestHandler,
	ResolveOptions,
	Server,
	ServerInitOptions,
	SSRManifest
} from './index.js';
import {
	HttpMethod,
	JSONObject,
	MaybePromise,
	RequestOptions,
	ResponseHeaders,
	TrailingSlash
} from './private.js';

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
			imports: string[];
			stylesheets: string[];
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

export interface ImportNode {
	name: string;
	dynamic: boolean;
}

export class InternalServer extends Server {
	init(options: ServerInitOptions): void;
	respond(
		request: Request,
		options: RequestOptions & {
			prerendering?: PrerenderOptions;
		}
	): Promise<Response>;
}

export interface ManifestData {
	assets: Asset[];
	components: string[];
	routes: RouteData[];
	matchers: Record<string, string>;
}

export interface MethodOverride {
	parameter: string;
	allowed: string[];
}

export type NormalizedLoadOutput = {
	status?: number;
	error?: Error;
	redirect?: string;
	props?: Record<string, any> | Promise<Record<string, any>>;
	stuff?: Record<string, any>;
	cache?: NormalizedLoadOutputCache;
	dependencies?: string[];
};

export interface NormalizedLoadOutputCache {
	maxage: number;
	private?: boolean;
}

export interface PageData {
	type: 'page';
	id: string;
	shadow: string | null;
	pattern: RegExp;
	path: string;
	a: Array<string | undefined>;
	b: Array<string | undefined>;
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
	dependencies: Map<string, PrerenderDependency>;
}

export type RecursiveRequired<T> = {
	// Recursive implementation of TypeScript's Required utility type.
	// Will recursively continue until it reaches a primitive or Function
	[K in keyof T]-?: Extract<T[K], Function> extends never // If it does not have a Function type
		? RecursiveRequired<T[K]> // recursively continue through.
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
	/** index into the `components` array in client-manifest.js */
	index: number;
	/** client-side module URL for this component */
	file: string;
	/** external JS files */
	imports: string[];
	/** external CSS files */
	stylesheets: string[];
	/** inlined styles */
	inline_styles?: () => MaybePromise<Record<string, string>>;
}

export type SSRNodeLoader = () => Promise<SSRNode>;

export interface SSROptions {
	csp: ValidatedConfig['kit']['csp'];
	dev: boolean;
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
	prerender: {
		default: boolean;
		enabled: boolean;
	};
	public_env: Record<string, string>;
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
	a: Array<number | undefined>;
	/**
	 * plan b — if one of them components fails in `load` we backtrack until we find
	 * the nearest error component.
	 */
	b: Array<number | undefined>;
}

export interface SSRErrorPage {
	id: '__error';
}

export interface SSRPagePart {
	id: string;
	load: SSRComponentLoader;
}

export type SSRRoute = SSREndpoint | SSRPage;

export interface SSRState {
	fallback?: string;
	getClientAddress: () => string;
	initiator?: SSRPage | SSRErrorPage;
	platform?: any;
	prerendering?: PrerenderOptions;
}

export type StrictBody = string | Uint8Array;

export type ValidatedConfig = RecursiveRequired<Config>;

export type ValidatedKitConfig = RecursiveRequired<KitConfig>;

export * from './index';
export * from './private';

declare global {
	const __SVELTEKIT_ADAPTER_NAME__: string;
	const __SVELTEKIT_APP_VERSION__: string;
	const __SVELTEKIT_APP_VERSION_FILE__: string;
	const __SVELTEKIT_APP_VERSION_POLL_INTERVAL__: number;
	const __SVELTEKIT_DEV__: boolean;
}
