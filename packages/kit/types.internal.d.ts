import { Load } from './types';

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
		adapter: [string, any];
		amp: boolean;
		appDir: string;
		files: {
			assets: string;
			lib: string;
			routes: string;
			serviceWorker: string;
			setup: string;
			template: string;
		};
		host: string;
		hostHeader: string;
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
		target: string;
	};
	preprocess: any;
};

export type App = {
	init: ({
		paths
	}: {
		paths: {
			base: string;
			assets: string;
		};
	}) => void;
	render: (request: Request, options: SSRRenderOptions) => Response;
};

export type Headers = Record<string, string>;

export type Request = {
	host: string;
	method: string;
	headers: Headers;
	path: string;
	body: any;
	query: URLSearchParams;
};

export type Response = {
	status: number;
	headers: Headers;
	body?: any;
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
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
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

export type SSRPage = {
	pattern: RegExp;
	params: (match: RegExpExecArray) => Record<string, string>;
	parts: SSRPagePart[];
	style: string;
	css: string[];
	js: string[];
};

export type CSRPage = {
	pattern: RegExp;
	params: (match: RegExpExecArray) => Record<string, string>;
	parts: CSRComponentLoader[];
};

export type Endpoint = {
	pattern: RegExp;
	params: (match: RegExpExecArray) => Record<string, string>;
	load: () => Promise<any>; // TODO
};

export type SSRManifest = {
	assets: Asset[];
	layout: SSRComponentLoader;
	error: SSRComponentLoader;
	pages: SSRPage[];
	endpoints: Endpoint[];
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
	setup?: {
		prepare?: (incoming: {
			headers: Headers;
		}) => {
			context?: any;
			headers?: Headers;
		};
		getSession: ({ context }: { context: any }) => any;
	};
	dev?: boolean;
	amp?: boolean;
	only_prerender?: boolean;
	app_dir?: string;
	host?: string;
	host_header?: string;
	get_component_path?: (id: string) => string;
	get_stack?: (error: Error) => string;
	get_static_file?: (file: string) => Buffer;
	get_amp_css?: (dep: string) => string;
	fetched?: string;
};

export type Asset = {
	file: string;
	size: number;
	type: string;
};

export type PageData = {
	pattern: RegExp;
	params: string[];
	parts: any[]; // TODO
};

export type EndpointData = {
	pattern: RegExp;
	params: string[];
	file: string;
};

export type ManifestData = {
	assets: Asset[];
	layout: string;
	error: string;
	components: string[];
	pages: PageData[];
	endpoints: EndpointData[];
};
