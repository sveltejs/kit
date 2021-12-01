import { ReadOnlyFormData, RequestHeaders } from './helper';
import { ServerResponse } from './hooks';
import { PrerenderOptions, SSRManifest } from './internal';

export class App {
	constructor(manifest: SSRManifest);
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
	method: string;
	host: string;
	path: string;
	query: URLSearchParams;
	headers: RequestHeaders;
	rawBody: RawBody;
}
