import { URLSearchParams } from 'url';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type IncomingRequest = {
	host: string; // TODO is this actually necessary?
	method: Method;
	headers: Record<string, string>;
	// TODO body
	path: string;
	query: URLSearchParams;
};

export type RenderOptions = {
	only_prerender: boolean;
	static_dir: string;
	template: string;
	manifest: RouteManifest;
	client: ClientManifest;
	App: any; // TODO
	load: (route: PageComponentManifest | ServerRouteManifest) => Promise<any>; // TODO
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

export type ServerRouteManifest = {
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
	server_routes: ServerRouteManifest[];
};

export type ClientManifest = {
	entry: string;
	deps: Record<string, { js: string[], css: string[] }>
};

export type Query = Record<string, string | true>;

export type Loader = (item: PageComponentManifest | ServerRouteManifest) => Promise<any>; // TODO types for modules