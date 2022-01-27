import { PrerenderOptions, SSRNodeLoader, SSRRoute } from './internal';

export interface RequestOptions<Platform = Record<string, any>> {
	platform?: Platform;
}

export class App {
	constructor(manifest: SSRManifest);
	render(request: Request, options?: RequestOptions): Promise<Response>;
}

export class InternalApp extends App {
	render(
		request: Request,
		options?: RequestOptions & {
			prerender?: PrerenderOptions;
		}
	): Promise<Response>;
}

export interface SSRManifest {
	appDir: string;
	assets: Set<string>;
	/** private fields */
	_: {
		mime: Record<string, string>;
		entry: {
			file: string;
			js: string[];
			css: string[];
		};
		nodes: SSRNodeLoader[];
		routes: SSRRoute[];
	};
}
