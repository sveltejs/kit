import { PrerenderOptions, SSRNodeLoader, SSRRoute } from './internal';

export class App {
	constructor(manifest: SSRManifest);
	render(request: Request): Promise<Response>;
}

export class InternalApp extends App {
	render(
		request: Request,
		options?: {
			prerender: PrerenderOptions;
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
