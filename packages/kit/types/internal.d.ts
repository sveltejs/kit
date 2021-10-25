import { RequestHandler } from './endpoint';
import { App as PublicApp, IncomingRequest } from './app';
import {
	ExternalFetch,
	GetSession,
	Handle,
	HandleError,
	ServerRequest,
	ServerResponse
} from './hooks';
import { Load } from './page';

type PageId = string;

export interface PrerenderOptions {
	fallback?: string;
	all: boolean;
	dependencies: Map<string, ServerResponse>;
}

export interface App extends PublicApp {
	init(options?: {
		paths: {
			base: string;
			assets: string;
		};
		prerendering: boolean;
		read(file: string): Buffer;
	}): void;

	render(
		incoming: IncomingRequest,
		options?: {
			prerender: PrerenderOptions;
		}
	): Promise<ServerResponse>;
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
	ssr?: boolean;
	router?: boolean;
	hydrate?: boolean;
	prerender?: boolean;
	preload?: any; // TODO remove for 1.0
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
	/**
	 * plan a is to render 1 or more layout components followed by a leaf component.
	 */
	a: PageId[];
	/**
	 * plan b — if one of them components fails in `load` we backtrack until we find
	 * the nearest error component.
	 */
	b: PageId[];
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

export type CSRRoute = [RegExp, CSRComponentLoader[], CSRComponentLoader[], GetParams?];

export interface SSRManifest {
	assets: Asset[];
	layout: string;
	error: string;
	routes: SSRRoute[];
}

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
	styles: string[];
}

export interface SSRRenderOptions {
	amp: boolean;
	dev: boolean;
	entry: {
		file: string;
		css: string[];
		js: string[];
	};
	floc: boolean;
	get_stack: (error: Error) => string | undefined;
	handle_error(error: Error & { frame?: string }, request: ServerRequest<any>): void;
	hooks: Hooks;
	hydrate: boolean;
	load_component(id: PageId): Promise<SSRNode>;
	manifest: SSRManifest;
	paths: {
		base: string;
		assets: string;
	};
	prerender: boolean;
	read(file: string): Buffer;
	root: SSRComponent['default'];
	router: boolean;
	service_worker?: string;
	ssr: boolean;
	target: string;
	template({ head, body }: { head: string; body: string }): string;
	trailing_slash: TrailingSlash;
}

export interface SSRRenderState {
	fetched?: string;
	initiator?: SSRPage | null;
	prerender?: PrerenderOptions;
	fallback?: string;
}

export interface Asset {
	file: string;
	size: number;
	type: string | null;
}

export interface PageData {
	type: 'page';
	pattern: RegExp;
	params: string[];
	path: string;
	a: string[];
	b: string[];
}

export interface EndpointData {
	type: 'endpoint';
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
	client: string[];
	server: string[];
	static: string[];
	entries: string[];
}

export interface NormalizedLoadOutput {
	status: number;
	error?: Error;
	redirect?: string;
	props?: Record<string, any> | Promise<Record<string, any>>;
	stuff?: Record<string, any>;
	maxage?: number;
}

export type TrailingSlash = 'never' | 'always' | 'ignore';
