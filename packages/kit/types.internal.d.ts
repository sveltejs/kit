import { Adapter, GetContext, GetSession, Handle, Incoming, Load, Response } from './types';
import { UserConfig as ViteConfig } from 'vite';
import { Response as NodeFetchResponse } from 'node-fetch';

declare global {
	interface ImportMeta {
		env: Record<string, string>;
	}
}

export type Logger = {
	(msg: string): void;
	success: (msg: string) => void;
	error: (msg: string) => void;
	warn: (msg: string) => void;
	minor: (msg: string) => void;
	info: (msg: string) => void;
};

export type ValidatedConfig = {
	compilerOptions: any;
	extensions: string[];
	kit: {
		adapter: Adapter;
		amp: boolean;
		appDir: string;
		files: {
			assets: string;
			hooks: string;
			lib: string;
			routes: string;
			serviceWorker: string;
			setup: string;
			template: string;
		};
		host: string;
		hostHeader: string;
		hydrate: boolean;
		paths: {
			base: string;
			assets: string;
		};
		prerender: {
			crawl: boolean;
			enabled: boolean;
			force: boolean;
			pages: string[];
		};
		router: boolean;
		ssr: boolean;
		target: string;
		vite: () => ViteConfig;
	};
	preprocess: any;
};

export type App = {
	init: ({
		paths,
		prerendering
	}: {
		paths: {
			base: string;
			assets: string;
		};
		prerendering: boolean;
	}) => void;
	render: (incoming: Incoming, options: SSRRenderOptions) => ResponseWithDependencies;
};

// TODO we want to differentiate between request headers, which
// always follow this type, and response headers, in which
// 'set-cookie' is a `string[]` (or at least `string | string[]`)
// but this can't happen until TypeScript 4.3
export type Headers = Record<string, string>;

export type ResponseWithDependencies = Response & {
	dependencies?: Record<string, Response>;
};

export type Page = {
	host: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
};

export type LoadInput = {
	page: Page;
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<NodeFetchResponse>;
	session: any;
	context: Record<string, any>;
};

export type LoadOutput = {
	status?: number;
	error?: Error;
	redirect?: string;
	props?: Record<string, any>;
	context?: Record<string, any>;
	maxage?: number;
};

export type SSRComponent = {
	ssr?: boolean;
	router?: boolean;
	hydrate?: boolean;
	prerender?: boolean;
	preload?: any; // TODO remove for 1.0
	load: Load;
	default: {
		render: (
			props: Record<string, any>
		) => {
			html: string;
			head: string;
			css: string;
		};
	};
};

export type SSRComponentLoader = () => Promise<SSRComponent>;

export type CSRComponent = any; // TODO

export type CSRComponentLoader = () => Promise<CSRComponent>;

export type SSRPagePart = {
	id: string;
	load: SSRComponentLoader;
};

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

export type SSRPage = {
	type: 'page';
	pattern: RegExp;
	params: GetParams;
	parts: SSRPagePart[];
	style: string;
	css: string[];
	js: string[];
};

export type SSREndpoint = {
	type: 'endpoint';
	pattern: RegExp;
	params: GetParams;
	load: () => Promise<any>; // TODO
};

export type SSRRoute = SSREndpoint | SSRPage;

export type CSRPage = [RegExp, CSRComponentLoader[], GetParams?];

export type CSREndpoint = [RegExp];

export type CSRRoute = CSREndpoint | CSRPage;

export type SSRManifest = {
	assets: Asset[];
	error: SSRComponentLoader;
	routes: SSRRoute[];
};

export type Hooks = {
	getContext?: GetContext;
	getSession?: GetSession;
	handle?: Handle;
};

// TODO separate out runtime options from the ones fixed in dev/build
export type SSRRenderOptions = {
	paths?: {
		base: string;
		assets: string;
	};
	local?: boolean;
	template?: ({ head, body }: { head: string; body: string }) => string;
	manifest?: SSRManifest;
	target?: string;
	entry?: string;
	root?: SSRComponent['default'];
	hooks?: Hooks;
	dev?: boolean;
	amp?: boolean;
	only_render_prerenderable_pages?: boolean;
	app_dir?: string;
	get_component_path?: (id: string) => string;
	get_stack?: (error: Error) => string;
	get_static_file?: (file: string) => Buffer;
	get_amp_css?: (dep: string) => string;
	fetched?: string;
	initiator?: SSRPage;
	ssr?: boolean;
	router?: boolean;
	hydrate?: boolean;
};

export type Asset = {
	file: string;
	size: number;
	type: string;
};

export type PageData = {
	type: 'page';
	pattern: RegExp;
	params: string[];
	parts: any[]; // TODO
};

export type EndpointData = {
	type: 'endpoint';
	pattern: RegExp;
	params: string[];
	file: string;
};

export type RouteData = PageData | EndpointData;

export type ManifestData = {
	assets: Asset[];
	error: string;
	components: string[];
	routes: RouteData[];
};
