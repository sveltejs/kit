import { Headers, ParameterizedBody } from './helper';

export type ServerRequest<Locals = Record<string, any>, Body = unknown> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	rawBody: string | ArrayBuffer;
	body: ParameterizedBody<Body>;
	locals: Locals;
};

export type ServerResponse = {
	status?: number;
	headers?: Headers;
	body?: any;
};

export type RequestHandler<Locals = Record<string, any>, Body = unknown> = (
	request: ServerRequest<Locals, Body>
) => void | ServerResponse | Promise<ServerResponse>;
