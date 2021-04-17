import { Load } from './page';
import { Incoming, GetContext, GetSession, Handle } from './hooks';
import { RequestHandler, ServerResponse } from './endpoint';

declare global {
	interface ImportMeta {
		env: Record<string, string>;
	}
}

type PageId = string;

export type Logger = {
	(msg: string): void;
	success: (msg: string) => void;
	error: (msg: string) => void;
	warn: (msg: string) => void;
	minor: (msg: string) => void;
	info: (msg: string) => void;
};

export type App = {
	init: ({
		paths,
		prerendering,
		read
	}: {
		paths: {
			base: string;
			assets: string;
		};
		prerendering: boolean;
		read: (file: string) => Buffer;
	}) => void;
	render: (
		incoming: Incoming,
		options?: {
			prerender: {
				force: boolean;
				dependencies: Map<string, ServerResponse>;
				error: Error;
			};
		}
	) => ServerResponse;
};

export type SSRComponent = {
	ssr?: boolean;
	router?: boolean;
	hydrate?: boolean;
	prerender?: boolean;
	preload?: any; // TODO remove for 1.0
	load: Load;
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

export type CSRComponent = any; // TODO

export type CSRComponentLoader = () => Promise<CSRComponent>;

export type SSRPagePart = {
	id: string;
	load: SSRComponentLoader;
};

export type GetParams = (match: RegExpExecArray) => Record<string, string>;

export type SSRPage = {
	type: 'page';
	pattern: RegExp;
	params: GetParams;
	// plan a is to render 1 or more layout components followed
	// by a leaf component. if one of them fails in `load`, we
	// backtrack until we find the nearest error component —
	// plan b — and render that instead
	a: PageId[];
	b: PageId[];
};

export type SSREndpoint = {
	type: 'endpoint';
	pattern: RegExp;
	params: GetParams;
	load: () => Promise<{
		[method: string]: RequestHandler;
	}>;
};

export type SSRRoute = SSREndpoint | SSRPage;

export type CSRPage = [RegExp, CSRComponentLoader[], CSRComponentLoader[], GetParams?];

export type CSREndpoint = [RegExp];

export type CSRRoute = CSREndpoint | CSRPage;

export type SSRManifest = {
	assets: Asset[];
	layout: string;
	error: string;
	routes: SSRRoute[];
};

export type Hooks = {
	getContext?: GetContext;
	getSession?: GetSession;
	handle?: Handle;
};

export type SSRNode = {
	module: SSRComponent;
	entry: string; // client-side module corresponding to this component
	css: string[];
	js: string[];
	styles: string[];
};

export type SSRRenderOptions = {
	amp: boolean;
	dev: boolean;
	entry: {
		file: string;
		css: string[];
		js: string[];
	};
	get_stack: (error: Error) => string;
	handle_error: (error: Error) => void;
	hooks: Hooks;
	hydrate: boolean;
	load_component: (id: PageId) => Promise<SSRNode>;
	manifest: SSRManifest;
	paths: {
		base: string;
		assets: string;
	};
	read: (file: string) => Buffer;
	root: SSRComponent['default'];
	router: boolean;
	ssr: boolean;
	target: string;
	template: ({ head, body }: { head: string; body: string }) => string;
};

export type SSRRenderState = {
	fetched?: string;
	initiator?: SSRPage;
	prerender?: {
		force: boolean;
		dependencies: Map<string, ServerResponse>;
		error: Error;
	};
};

export type Asset = {
	file: string;
	size: number;
	type: string;
};

export type PageData = {
	type: 'page';
	pattern: RegExp;
	params: string[];
	path: string;
	a: string[];
	b: string[];
};

export type EndpointData = {
	type: 'endpoint';
	pattern: RegExp;
	params: string[];
	file: string;
};

export type RouteData = PageData | EndpointData;

export type ManifestData = {
	assets: Asset[];
	layout: string;
	error: string;
	components: string[];
	routes: RouteData[];
};

export type BuildData = {
	client: string[];
	server: string[];
	static: string[];
	entries: string[];
};
