import { ReadOnlyFormData, RequestHeaders } from './helper';
import { ServerResponse } from './hooks';

export interface App {
	init(): void;
	render<AdapterRequest = unknown, AdapterResponse = unknown>(
		incoming: IncomingRequest<AdapterRequest>
	): Promise<ServerResponse<AdapterResponse>>;
}

export type RawBody = null | Uint8Array;
export type ParameterizedBody<Body = unknown> = Body extends FormData
	? ReadOnlyFormData
	: (string | RawBody | ReadOnlyFormData) & Body;

export interface IncomingRequest<AdapterRequest = unknown> {
	method: string;
	host: string;
	path: string;
	query: URLSearchParams;
	headers: RequestHeaders;
	rawBody: RawBody;
	adapter?: AdapterRequest;
}
