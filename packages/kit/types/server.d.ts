import { Headers, ParameterizedBody } from './helper';

export type ServerRequest<Context = any, Body = unknown> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: ParameterizedBody<Body>;
	context: Context;
};

export type RequestHandler<Context = any, Body = unknown> = (
	request: ServerRequest<Context, Body>
) => Response | Promise<Response>;

export type ServerResponse = {
	status?: number;
	headers?: Headers;
	body?: any;
};
