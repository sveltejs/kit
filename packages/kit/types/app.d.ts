import { ReadOnlyFormData, RequestHeaders } from './helper';
import { ServerResponse } from './hooks';

export interface Init {
	(): void;
}

export interface Render {
	(incoming: IncomingRequest): Promise<ServerResponse>;
}

export interface App {
	init: Init;
	render: Render;
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
