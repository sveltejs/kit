import { Headers, ParameterizedBody } from './helper';

export type ServerRequest<Locals = Record<string, any>, Body = unknown> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	rawBody: string | Uint8Array;
	body: ParameterizedBody<Body>;
	locals: Locals;
};

type JSONValue =
	| string
	| number
	| boolean
	| null
	| Date
	| JSONValue[]
	| { [key: string]: JSONValue };

export type EndpointOutput = {
	status?: number;
	headers?: Headers;
	body?: string | Uint8Array | JSONValue;
};

export type RequestHandler<Locals = Record<string, any>, Body = unknown> = (
	request: ServerRequest<Locals, Body>
) => void | EndpointOutput | Promise<EndpointOutput>;
