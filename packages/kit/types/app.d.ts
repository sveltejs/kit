import { ReadOnlyFormData, RequestHeaders } from './helper';
import { ServerResponse } from './hooks';
import { PrerenderOptions, SSRNodeLoader, SSRRoute } from './internal';

export class App {
	constructor(manifest: SSRManifest);
	render(incoming: IncomingRequest): Promise<ServerResponse>;
}

export class InternalApp extends App {
	render(
		incoming: IncomingRequest,
		options?: {
			prerender: PrerenderOptions;
		}
	): Promise<ServerResponse>;
}

export type RawBody = null | Uint8Array;
export type ParameterizedBody<Body = unknown> = Body extends FormData
	? ReadOnlyFormData
	: (string | RawBody | ReadOnlyFormData) & Body;

export interface IncomingRequest {
	url: string | URL;
	method: string;
	headers: RequestHeaders;
	rawBody: RawBody;
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
