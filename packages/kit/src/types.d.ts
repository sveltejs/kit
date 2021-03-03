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
	render: (
		request: Request,
		options: RenderOptions
	) => Response & {
		dependencies: Response[];
	};
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
	body: any;
};

export type Manifest = {};

export type RenderOptions = {
	paths?: {
		base: string;
		assets: string;
	};
	local?: boolean;
	template?: ({ head: string, body: string }) => string;
	manifest?: Manifest;
	target?: string;
	start_global?: string;
	entry?: string;
	root?: string;
	setup?: string;
	dev?: boolean;
	amp?: boolean;
	only_prerender?: boolean;
	app_dir?: string;
	host?: string;
	host_header?: string;
	get_stack?: (error: Error) => string;
	get_static_file?: (file: string) => Buffer;
	get_amp_css?: (dep: string) => string;
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
