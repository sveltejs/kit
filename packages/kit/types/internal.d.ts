import { OutputAsset, OutputChunk } from 'rollup';
import { SvelteComponent } from 'svelte/internal';
import {
	Action,
	Config,
	ExternalFetch,
	ServerLoad,
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
import { HttpMethod, MaybePromise, RequestOptions, TrailingSlash } from './private.js';

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

export interface CSRPageNode {
	component: typeof SvelteComponent;
	shared: {
		load: Load;
		hydrate: boolean;
		router: boolean;
	};
	server: boolean;
}

export type CSRPageNodeLoader = () => Promise<CSRPageNode>;

export type CSRRoute = {
	id: string;
	exec: (path: string) => undefined | Record<string, string>;
	errors: CSRPageNodeLoader[];
	layouts: CSRPageNodeLoader[];
	leaf: CSRPageNodeLoader;
	uses_server_data: boolean;
};

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

export interface Hooks {
	externalFetch: ExternalFetch;
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
	nodes: PageNode[];
	routes: RouteData[];
	matchers: Record<string, string>;
}

export interface MethodOverride {
	parameter: string;
	allowed: string[];
}

export interface PageNode {
	component?: string; // TODO supply default component if it's missing (bit of an edge case)
	shared?: string;
	server?: string;
	parent_id?: string;
}

export type PayloadScriptAttributes =
	| { type: 'data'; url: string; body?: string }
	| { type: 'server_data' }
	| { type: 'validation_errors' };

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

export interface Respond {
	(request: Request, options: SSROptions, state: SSRState): Promise<Response>;
}

export interface RouteData {
	id: string;
	parent: RouteData | null;

	segment: string;
	pattern: RegExp;
	names: string[];
	types: string[];

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

	shared: {
		load?: Load;
		hydrate?: boolean;
		prerender?: boolean;
		router?: boolean;
	};

	server: {
		load?: ServerLoad;
		prerender?: boolean;
		POST?: Action;
		PATCH?: Action;
		PUT?: Action;
		DELETE?: Action;
	};

	// store this in dev so we can print serialization errors
	server_id?: string;
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

export interface SSRErrorPage {
	id: '__error';
}

export interface PageNodeIndexes {
	errors: Array<number | undefined>;
	layouts: Array<number | undefined>;
	leaf: number;
}

export type SSREndpoint = Partial<Record<HttpMethod, RequestHandler>>;

export interface SSRRoute {
	id: string;
	pattern: RegExp;
	names: string[];
	types: string[];

	page: PageNodeIndexes | null;

	endpoint: (() => Promise<SSREndpoint>) | null;
}

export interface SSRState {
	fallback?: string;
	getClientAddress: () => string;
	initiator?: SSRRoute | SSRErrorPage;
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
