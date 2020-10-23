import { URLSearchParams } from 'url';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type Headers = Record<string, string>;

export type IncomingRequest = {
	host: string; // TODO is this actually necessary?
	method: Method;
	headers: Headers;
	// TODO body
	path: string;
	query: URLSearchParams;
};

export type EndpointResponse = {
	status: number;
	headers?: Headers;
	body?: any; // TODO what types can body be?
};

export type PageResponse = EndpointResponse & {
	dependencies?: Record<string, EndpointResponse>;
};

type SetupModule<Context = any, Session = any> = {
	prepare?: (headers: Headers) => Promise<{ context: Context, headers: Headers }>;
	getSession?: (context: Context) => Promise<Session>;
	setSession?: (context: Context, session: Session) => Promise<Session>;
};

export type RenderOptions = {
	only_prerender: boolean; // TODO this shouldn't really be part of the public API
	static_dir: string;
	template: string;
	manifest: RouteManifest;
	client: ClientManifest;
	root: any; // TODO
	setup: SetupModule;
	load: (route: PageComponentManifest | EndpointManifest) => Promise<any>; // TODO
	dev: boolean; // TODO this is awkward
};

export type PageComponentManifest = {
	default?: boolean;
	type?: string;
	name: string;
	file: string;
};

export type PageManifest = {
	pattern: RegExp;
	path: string;
	parts: Array<{
		component: PageComponentManifest;
		params: string[];
	}>;
};

export type EndpointManifest = {
	name: string;
	pattern: RegExp;
	file: string;
	params: string[];
};

export type RouteManifest = {
	error: PageComponentManifest;
	layout: PageComponentManifest;
	components: PageComponentManifest[];
	pages: PageManifest[];
	endpoints: EndpointManifest[];
};

export type ClientManifest = {
	entry: string;
	deps: Record<string, { js: string[], css: string[] }>
};

export type Loader = (item: PageComponentManifest | EndpointManifest) => Promise<any>; // TODO types for modules