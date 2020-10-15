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