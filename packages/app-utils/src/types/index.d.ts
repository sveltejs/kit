import { URLSearchParams } from 'url';

// do not import this file from outside app-utils
// these types are re-exported in /index.d.ts and should be imported from "@sveltejs/app-utils"

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type Headers = Record<string, string>;

export interface IncomingRequest {
	host: string | null; // TODO is this actually necessary?
	method: Method;
	headers: Headers;
	body?: any; // TODO
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

export interface SetupModule<Context = any, Session = any> {
	prepare?: (headers: Headers) => Promise<{ context: Context, headers: Headers }>;
	getSession?: (context: Context) => Promise<Session> | Session;
	setSession?: (context: Context, session: Session) => Promise<Session> | Session;
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

export type RouteParams = Record<string, string | string[]>;

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
	/**
	 * Each part contains the parameters for the page (last part) or layout (earlier parts)
	 * corresponding to a URL segment any part except the last may be null
	 * if there is no layout for that segment.
	 */
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

export type Query = Record<string, string | string[]>;

export interface Page {
	host: string;
	path: string;
	params: RouteParams;
	query: Query;
}

export interface PageContext extends Page {
	error?: Error
}
