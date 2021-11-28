import { ReadOnlyFormData, RequestHeaders } from './helper';
import { ServerResponse } from './hooks';
import { SSRManifest } from './internal';

export interface App {
	init(options: { manifest: SSRManifest }): void;
	render(incoming: IncomingRequest): Promise<ServerResponse>;
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
