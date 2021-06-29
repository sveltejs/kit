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

type DefaultBody = JSONValue | Uint8Array;

export type EndpointOutput<ResBody = DefaultBody> = {
	status?: number;
	headers?: Partial<Headers>;
	body?: ResBody;
};

export type RequestHandler<
	Locals = Record<string, any>,
	ReqBody = unknown,
	ResBody = DefaultBody
> = (request: ServerRequest<Locals, ReqBody>) => MaybePromise<void | EndpointOutput<ResBody>>;
