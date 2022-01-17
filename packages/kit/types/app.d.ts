import { ReadOnlyFormData, RequestHeaders } from './helper';
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

export type RawBody = null | Uint8Array;
export type ParameterizedBody<Body = unknown> = Body extends FormData
	? ReadOnlyFormData
	: (string | RawBody | ReadOnlyFormData) & Body;

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
