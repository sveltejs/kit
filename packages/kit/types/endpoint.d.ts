import { Headers, ParameterizedBody } from './helper';

export type ServerRequest<Context = any, Body = unknown> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	rawBody: string | ArrayBuffer;
	body: ParameterizedBody<Body>;
	context: Context;
};

export type ServerResponse = {
	status?: number;
	headers?: Headers;
	body?: any;
};

export type RequestHandler<Context = any, Body = unknown> = (
	request: ServerRequest<Context, Body>
) => void | ServerResponse | Promise<ServerResponse>;
