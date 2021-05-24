import { Headers, Location, ParameterizedBody } from './helper';

export type ServerRequest<Locals = Record<string, any>, Body = unknown> = Location & {
	method: string;
	headers: Headers;
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
	headers?: Partial<Headers>;
	body?: string | Uint8Array | JSONValue;
};

export type RequestHandler<Locals = Record<string, any>, Body = unknown> = (
	request: ServerRequest<Locals, Body>
) => void | EndpointOutput | Promise<EndpointOutput>;
