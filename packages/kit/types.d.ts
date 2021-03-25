import { Headers, LoadInput, LoadOutput, Logger } from './types.internal';

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
		target?: string;
		vite?: {} | (() => {});
	};
	preprocess?: any;
};

type Builder = {
	copy_client_files: (dest: string) => void;
	copy_server_files: (dest: string) => void;
	copy_static_files: (dest: string) => void;
	prerender: ({ force, dest }: { force?: boolean; dest: string }) => Promise<void>;
	log: Logger;
};

export type Adapter = {
	name: string;
	adapt: (builder: Builder) => Promise<void>;
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

export type Request<Context = any> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: string | Buffer | ReadOnlyFormData;
	context: Context;
};

export type Response = {
	status?: number;
	headers?: Headers;
	body?: any;
};

export type RequestHandler<Context = any> = (
	request?: Request<Context>
) => Response | Promise<Response>;

export type Load = (input: LoadInput) => LoadOutput | Promise<LoadOutput>;
