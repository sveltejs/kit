import { ServerRequest } from './hooks';
import { Headers, MaybePromise } from './helper';

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
	body?: JSONValue | Uint8Array;
};

export type RequestHandler<Locals = Record<string, any>, Body = unknown> = (
	request: ServerRequest<Locals, Body>
) => MaybePromise<void | EndpointOutput>;
