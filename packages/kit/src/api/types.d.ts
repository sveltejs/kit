export type Logger = {
	(msg: string): void;
	success: (msg: string) => void;
	error: (msg: string) => void;
	warn: (msg: string) => void;
	minor: (msg: string) => void;
	info: (msg: string) => void;
};

export type Config = {
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

export type RenderOptions = {
	local: boolean;
	only_prerender: boolean;
	get_static_file: (file: string) => Buffer;
};
