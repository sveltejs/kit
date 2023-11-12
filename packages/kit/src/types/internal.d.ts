import { SvelteComponent } from 'svelte';
import {
	Config,
	ServerLoad,
	Handle,
	HandleServerError,
	KitConfig,
	Load,
	RequestHandler,
	ResolveOptions,
	Server,
	ServerInitOptions,
	HandleFetch,
	Actions,
	HandleClientError
} from '@sveltejs/kit';
import {
	HttpMethod,
	MaybePromise,
	PrerenderOption,
	RequestOptions,
	TrailingSlash
} from './private.js';

export interface ServerModule {
	Server: typeof InternalServer;
}

export interface ServerInternalModule {
	set_building(building: boolean): void;
	set_assets(path: string): void;
	set_private_env(environment: Record<string, string>): void;
	set_public_env(environment: Record<string, string>): void;
	set_version(version: string): void;
	set_fix_stack_trace(fix_stack_trace: (error: unknown) => string): void;
}

export interface Asset {
	file: string;
	size: number;
	type: string | null;
}

export interface AssetDependencies {
	file: string;
	imports: string[];
	stylesheets: string[];
	fonts: string[];
}

export interface BuildData {
	app_dir: string;
	app_path: string;
	manifest_data: ManifestData;
	service_worker: string | null;
	client: {
		start: string;
		app: string;
		imports: string[];
		stylesheets: string[];
		fonts: string[];
	} | null;
	server_manifest: import('vite').Manifest;
}

export interface CSRPageNode {
	component: typeof SvelteComponent;
	universal: {
		load?: Load;
		trailingSlash?: TrailingSlash;
	};
}

export type CSRPageNodeLoader = () => Promise<CSRPageNode>;

/**
 * Definition of a client side route.
 * The boolean in the tuples indicates whether the route has a server load.
 */
export type CSRRoute = {
	id: string;
	exec(path: string): undefined | Record<string, string>;
	errors: Array<CSRPageNodeLoader | undefined>;
	layouts: Array<[has_server_load: boolean, node_loader: CSRPageNodeLoader] | undefined>;
	leaf: [has_server_load: boolean, node_loader: CSRPageNodeLoader];
};

export interface Deferred {
	fulfil: (value: any) => void;
	reject: (error: Error) => void;
}

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

export interface ServerHooks {
	handleFetch: HandleFetch;
	handle: Handle;
	handleError: HandleServerError;
}

export interface ClientHooks {
	handleError: HandleClientError;
}

export interface Env {
	private: Record<string, string>;
	public: Record<string, string>;
}

export class InternalServer extends Server {
	init(options: ServerInitOptions): Promise<void>;
	respond(
		request: Request,
		options: RequestOptions & {
			prerendering?: PrerenderOptions;
			read: (file: string) => Buffer;
		}
	): Promise<Response>;
}

export interface ManifestData {
	assets: Asset[];
	nodes: PageNode[];
	routes: RouteData[];
	matchers: Record<string, string>;
}

export interface PageNode {
	depth: number;
	component?: string; // TODO supply default component if it's missing (bit of an edge case)
	universal?: string;
	server?: string;
	parent_id?: string;
	parent?: PageNode;
	/**
	 * Filled with the pages that reference this layout (if this is a layout)
	 */
	child_pages?: PageNode[];
}

export interface PrerenderDependency {
	response: Response;
	body: null | string | Uint8Array;
}

export interface PrerenderOptions {
	cache?: string; // including this here is a bit of a hack, but it makes it easy to add <meta http-equiv>
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

export interface RouteParam {
	name: string;
	matcher: string;
	optional: boolean;
	rest: boolean;
	chained: boolean;
}

/**
 * Represents a route segment in the app. It can either be an intermediate node
 * with only layout/error pages, or a leaf, at which point either `page` and `leaf`
 * or `endpoint` is set.
 */
export interface RouteData {
	id: string;
	parent: RouteData | null;

	segment: string;
	pattern: RegExp;
	params: RouteParam[];

	layout: PageNode | null;
	error: PageNode | null;
	leaf: PageNode | null;

	page: {
		layouts: Array<number | undefined>;
		errors: Array<number | undefined>;
		leaf: number;
	} | null;

	endpoint: {
		file: string;
	} | null;
}

export type ServerRedirectNode = {
	type: 'redirect';
	location: string;
};

export type ServerNodesResponse = {
	type: 'data';
	/**
	 * If `null`, then there was no load function <- TODO is this outdated now with the recent changes?
	 */
	nodes: Array<ServerDataNode | ServerDataSkippedNode | ServerErrorNode | null>;
};

export type ServerDataResponse = ServerRedirectNode | ServerNodesResponse;

/**
 * Signals a successful response of the server `load` function.
 * The `uses` property tells the client when it's possible to reuse this data
 * in a subsequent request.
 */
export interface ServerDataNode {
	type: 'data';
	/**
	 * The serialized version of this contains a serialized representation of any deferred promises,
	 * which will be resolved later through chunk nodes.
	 */
	data: Record<string, any> | null;
	uses: Uses;
	slash?: TrailingSlash;
}

/**
 * Resolved data/error of a deferred promise.
 */
export interface ServerDataChunkNode {
	type: 'chunk';
	id: number;
	data?: Record<string, any>;
	error?: any;
}

/**
 * Signals that the server `load` function was not run, and the
 * client should use what it has in memory
 */
export interface ServerDataSkippedNode {
	type: 'skip';
}

/**
 * Signals that the server `load` function failed
 */
export interface ServerErrorNode {
	type: 'error';
	error: App.Error;
	/**
	 * Only set for HttpErrors
	 */
	status?: number;
}

export interface ServerMetadataRoute {
	config: any;
	api: {
		methods: Array<HttpMethod | '*'>;
	};
	page: {
		methods: Array<'GET' | 'POST'>;
	};
	methods: Array<HttpMethod | '*'>;
	prerender: PrerenderOption | undefined;
	entries: string[] | undefined;
}

export interface ServerMetadata {
	nodes: Array<{ has_server_load: boolean }>;
	routes: Map<string, ServerMetadataRoute>;
}

export interface SSRComponent {
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

export interface SSRNode {
	component: SSRComponentLoader;
	/** index into the `components` array in client/manifest.js */
	index: number;
	/** external JS files */
	imports: string[];
	/** external CSS files */
	stylesheets: string[];
	/** external font files */
	fonts: string[];
	/** inlined styles */
	inline_styles?(): MaybePromise<Record<string, string>>;

	universal: {
		load?: Load;
		prerender?: PrerenderOption;
		ssr?: boolean;
		csr?: boolean;
		trailingSlash?: TrailingSlash;
		config?: any;
		entries?: PrerenderEntryGenerator;
	};

	server: {
		load?: ServerLoad;
		prerender?: PrerenderOption;
		ssr?: boolean;
		csr?: boolean;
		trailingSlash?: TrailingSlash;
		actions?: Actions;
		config?: any;
		entries?: PrerenderEntryGenerator;
	};

	universal_id: string;
	server_id: string;
}

export type SSRNodeLoader = () => Promise<SSRNode>;

export interface SSROptions {
	app_template_contains_nonce: boolean;
	csp: ValidatedConfig['kit']['csp'];
	csrf_check_origin: boolean;
	track_server_fetches: boolean;
	embedded: boolean;
	env_public_prefix: string;
	env_private_prefix: string;
	hooks: ServerHooks;
	preload_strategy: ValidatedConfig['kit']['output']['preloadStrategy'];
	root: SSRComponent['default'];
	service_worker: boolean;
	templates: {
		app(values: {
			head: string;
			body: string;
			assets: string;
			nonce: string;
			env: Record<string, string>;
		}): string;
		error(values: { message: string; status: number }): string;
	};
	version_hash: string;
}

export interface PageNodeIndexes {
	errors: Array<number | undefined>;
	layouts: Array<number | undefined>;
	leaf: number;
}

export type PrerenderEntryGenerator = () => MaybePromise<Array<Record<string, string>>>;

export type SSREndpoint = Partial<Record<HttpMethod, RequestHandler>> & {
	prerender?: PrerenderOption;
	trailingSlash?: TrailingSlash;
	config?: any;
	entries?: PrerenderEntryGenerator;
	fallback?: RequestHandler;
};

export interface SSRRoute {
	id: string;
	pattern: RegExp;
	params: RouteParam[];
	page: PageNodeIndexes | null;
	endpoint: (() => Promise<SSREndpoint>) | null;
	endpoint_id?: string;
}

export interface SSRState {
	fallback?: string;
	getClientAddress(): string;
	/**
	 * True if we're currently attempting to render an error page
	 */
	error: boolean;
	/**
	 * Allows us to prevent `event.fetch` from making infinitely looping internal requests
	 */
	depth: number;
	platform?: any;
	prerendering?: PrerenderOptions;
	/**
	 * When fetching data from a +server.js endpoint in `load`, the page's
	 * prerender option is inherited by the endpoint, unless overridden
	 */
	prerender_default?: PrerenderOption;
	read?: (file: string) => Buffer;
}

export type StrictBody = string | ArrayBufferView;

export interface Uses {
	dependencies: Set<string>;
	params: Set<string>;
	parent: boolean;
	route: boolean;
	url: boolean;
}

export type ValidatedConfig = RecursiveRequired<Config>;

export type ValidatedKitConfig = RecursiveRequired<KitConfig>;

export * from '../exports/index.js';
export * from './private.js';
