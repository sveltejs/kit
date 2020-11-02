import { URLSearchParams } from 'url';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type Headers = Record<string, string>;

export interface IncomingRequest {
	host: string | null; // TODO is this actually necessary?
	method: Method;
	headers: Headers;
	body: any; // TODO
	path: string;
	query: URLSearchParams;
}

export interface EndpointResponse {
	status: number;
	headers: Headers;
	body: any; // TODO what types can body be?
}

export interface PageResponse extends EndpointResponse {
	dependencies: Record<string, EndpointResponse>;
}

export interface SetupModule {
	prepare?: (headers: Headers) => Promise<{ context: any, headers: Headers }>;
	getSession?: (context: any) => Promise<any>;
	setSession?: (context: any, session: any) => Promise<any>;
}

export interface SSRComponentModule {
	default: SSRComponent;
}

export interface SSRComponent {
	render(props: unknown): {
		html: string
		head: string
		css: { code: string, map: unknown };
	}
}

export interface RenderOptions {
	only_prerender: boolean; // TODO this shouldn't really be part of the public API
	static_dir: string;
	template: string;
	manifest: RouteManifest;
	client: ClientManifest;
	root: SSRComponentModule;
	setup: SetupModule;
	load: (route: PageComponentManifest | EndpointManifest) => Promise<any>; // TODO
	dev: boolean; // TODO this is awkward
}

export interface PageComponentManifest {
	default?: boolean;
	type?: string;
	url: string;
	name: string;
	file: string;
}

export interface PageManifestPart {
	component: PageComponentManifest;
	params: string[];
}

export interface PageManifest {
	pattern: RegExp;
	path: string;
	// each part contains the parameters for the page (last part) or layout (earlier parts) corresponding to a URL segment
	// any part except the last may be null if there is no layout for that segment.
	parts: Array<PageManifestPart | null>;
}

export interface EndpointManifest {
	name: string;
	pattern: RegExp;
	file: string;
	url: string;
	params: string[];
}

export interface RouteManifest {
	error: PageComponentManifest;
	layout: PageComponentManifest;
	components: PageComponentManifest[];
	pages: PageManifest[];
	endpoints: EndpointManifest[];
}

export interface ClientManifest {
	entry: string;
	deps: Record<string, { js: string[], css: string[] }>
}

export type Loader = (item: PageComponentManifest | EndpointManifest) => Promise<any>; // TODO types for modules
