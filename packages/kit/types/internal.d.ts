import { OutputAsset, OutputChunk } from 'rollup';
import { ValidatedConfig } from './config';
import { InternalApp, SSRManifest } from './app';
import { Fallthrough, RequestHandler, ShadowRequestHandler } from './endpoint';
import { Either } from './helper';
import { ExternalFetch, GetSession, Handle, HandleError, RequestEvent } from './hooks';
import { Load } from './page';

export interface PrerenderDependency {
	response: Response;
	body: null | string | Uint8Array;
}

export interface PrerenderOptions {
	fallback?: string;
	all: boolean;
	dependencies: Map<string, PrerenderDependency>;
}

export interface AppModule {
	App: typeof InternalApp;

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

export interface Logger {
	(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
	warn(msg: string): void;
	minor(msg: string): void;
	info(msg: string): void;
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

export type CSRComponent = any; // TODO

export type CSRComponentLoader = () => Promise<CSRComponent>;

export interface SSRPagePart {
	id: string;
	load: SSRComponentLoader;
}

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

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

export interface SSREndpoint {
	type: 'endpoint';
	pattern: RegExp;
	params: GetParams;
	load(): Promise<{
		[method: string]: RequestHandler;
	}>;
}

export type SSRRoute = SSREndpoint | SSRPage;

type HasShadow = 1;
export type CSRRoute = [RegExp, CSRComponentLoader[], CSRComponentLoader[], GetParams?, HasShadow?];

export type SSRNodeLoader = () => Promise<SSRNode>;

export interface Hooks {
	externalFetch: ExternalFetch;
	getSession: GetSession;
	handle: Handle;
	handleError: HandleError;
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

export interface SSRState {
	fetched?: string;
	initiator?: SSRPage | null;
	platform?: any;
	prerender?: PrerenderOptions;
	fallback?: string;
}

export interface Asset {
	file: string;
	size: number;
	type: string | null;
}

export interface RouteSegment {
	content: string;
	dynamic: boolean;
	rest: boolean;
}

export type HttpMethod = 'get' | 'head' | 'post' | 'put' | 'delete' | 'patch';

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

export interface EndpointData {
	type: 'endpoint';
	key: string;
	segments: RouteSegment[];
	pattern: RegExp;
	params: string[];
	file: string;
}

export type RouteData = PageData | EndpointData;

export interface ManifestData {
	assets: Asset[];
	layout: string;
	error: string;
	components: string[];
	routes: RouteData[];
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
	static: string[];
	entries: string[];
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

export type TrailingSlash = 'never' | 'always' | 'ignore';
export interface MethodOverride {
	parameter: string;
	allowed: string[];
}

export interface Respond {
	(request: Request, options: SSROptions, state?: SSRState): Promise<Response>;
}
