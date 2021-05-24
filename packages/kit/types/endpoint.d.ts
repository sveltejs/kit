import { ServerRequest } from './hooks';
import { Headers } from './helper';

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
