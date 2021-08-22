import { Headers, RawBody } from './helper';
import { ServerResponse } from './hooks';

export interface IncomingRequest {
	method: string;
	host: string;
	path: string;
	query: URLSearchParams;
	headers: Headers;
	rawBody: RawBody;
}

export interface App {
	init({
		paths,
		prerendering,
		read
	}?: {
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
