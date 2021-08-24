import { Headers, ReadOnlyFormData } from './helper';
import { ServerResponse } from './hooks';

export interface App {
	init(options?: {
		paths: {
			base: string;
			assets: string;
		};
		prerendering: boolean;
		read(file: string): Buffer;
	}): void;
	render(
		incoming: IncomingRequest,
		options?: {
			prerender: {
				fallback?: string;
				all: boolean;
				dependencies?: Map<string, ServerResponse>;
			};
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
	headers: Headers;
	rawBody: RawBody;
}
