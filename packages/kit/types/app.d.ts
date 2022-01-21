import { PrerenderOptions, SSRNodeLoader, SSRRoute } from './internal';

export interface RenderEvent<Platform = Record<string, unknown>> {
	request: Request;
	platform?: Platform;
}

export class App {
	constructor(manifest: SSRManifest);
	render(renderEvent: RenderEvent): Promise<Response>;
}

export class InternalApp extends App {
	render(
		renderEvent: RenderEvent,
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
