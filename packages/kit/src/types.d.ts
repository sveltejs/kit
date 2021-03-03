export type Logger = {
	(msg: string): void;
	success: (msg: string) => void;
	error: (msg: string) => void;
	warn: (msg: string) => void;
	minor: (msg: string) => void;
	info: (msg: string) => void;
};

export type Config = {
	compilerOptions?: any;
	extensions?: string[];
	kit?: {
		adapter?: string | [string, any];
		amp?: boolean;
		appDir?: string;
		files?: {
			assets?: string;
			routes?: string;
			setup?: string;
			template?: string;
		};
		host?: string;
		hostHeader?: string;
		paths?: {
			base?: string;
			assets?: string;
		};
		prerender?: {
			crawl?: boolean;
			enabled?: boolean;
			force?: boolean;
			pages?: string[];
		};
		startGlobal?: string;
		target?: string;
	};
	preprocess?: any;
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
			routes: string;
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
		startGlobal: string;
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
	render: (request: Request, options: RenderOptions) => Response;
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

export type PreloadContext = {
	// TODO need to avoid having a bunch of different types called Page
};

export type SSRComponent = {
	prerender?: boolean;
	load: (
		preload_context: PreloadContext
	) => {
		status?: number;
		error?: Error | string;
		redirect?: string;
		props: Record<string, any>;
		context: Record<string, any>;
	};
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

export type Page = {
	pattern: RegExp;
	params: (match: RegExpMatchArray) => Record<string, string | string[]>;
	parts: SSRComponentLoader[];
	style: string;
	css: string[];
	js: string[];
};

export type Endpoint = {
	pattern: RegExp;
	params: (match: RegExpMatchArray) => Record<string, string | string[]>;
	load: () => Promise<any>; // TODO
};

export type Manifest = {
	assets: Asset[];
	layout: SSRComponentLoader;
	error: SSRComponentLoader;
	pages: Page[];
	endpoints: Endpoint[];
};

export type RenderOptions = {
	paths?: {
		base: string;
		assets: string;
	};
	local?: boolean;
	template?: ({ head, body }: { head: string; body: string }) => string;
	manifest?: Manifest;
	target?: string;
	start_global?: string;
	entry?: string;
	root?: SSRComponent['default'];
	setup?: {
		prepare?: (
			headers: Headers
		) => {
			context?: any;
			headers?: Headers;
		};
		getSession: (context: any) => any;
	};
	dev?: boolean;
	amp?: boolean;
	only_prerender?: boolean;
	app_dir?: string;
	host?: string;
	host_header?: string;
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
