import { Headers, LoadInput, LoadOutput, Logger } from './types.internal';
import { UserConfig as ViteConfig } from 'vite';

export type Config = {
	compilerOptions?: any;
	extensions?: string[];
	kit?: {
		adapter?: Adapter;
		amp?: boolean;
		appDir?: string;
		files?: {
			assets?: string;
			hooks?: string;
			lib?: string;
			routes?: string;
			serviceWorker?: string;
			template?: string;
		};
		host?: string;
		hostHeader?: string;
		hydrate?: boolean;
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
		router?: boolean;
		ssr?: boolean;
		target?: string;
		vite?: ViteConfig | (() => ViteConfig);
	};
	preprocess?: any;
};

type AdapterUtils = {
	copy_client_files: (dest: string) => void;
	copy_server_files: (dest: string) => void;
	copy_static_files: (dest: string) => void;
	copy: (from: string, to: string, filter?: (basename: string) => boolean) => void;
	prerender: ({ force, dest }: { force?: boolean; dest: string }) => Promise<void>;
	log: Logger;
};

export type Adapter = {
	name: string;
	adapt: (utils: AdapterUtils) => Promise<void>;
};

interface ReadOnlyFormData extends Iterator<[string, string]> {
	get: (key: string) => string;
	getAll: (key: string) => string[];
	has: (key: string) => boolean;
	entries: () => Iterator<[string, string]>;
	keys: () => Iterator<string>;
	values: () => Iterator<string>;
}

export type Incoming = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	query: URLSearchParams;
	body: string | Buffer | ReadOnlyFormData;
};

type BaseBody = string | Buffer | ReadOnlyFormData;
type ParameterizedBody<Body = unknown> = BaseBody & Body;

export type Request<Context = any, Body = unknown> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: ParameterizedBody<Body>;
	context: Context;
};

export type Response = {
	status?: number;
	headers?: Headers;
	body?: any;
};

export type RequestHandler<Context = any, Body = unknown> = (
	request?: Request<Context, Body>
) => Response | Promise<Response>;

export type Load = (input: LoadInput) => LoadOutput | Promise<LoadOutput>;

export type GetContext<Context = any> = (incoming: Incoming) => Context;

export type GetSession<Context = any, Session = any> = {
	({ context }: { context: Context }): Session | Promise<Session>;
};

export type Handle<Context = any> = (
	request: Request<Context>,
	render: (request: Request<Context>) => Response | Promise<Response>
) => Response | Promise<Response>;
