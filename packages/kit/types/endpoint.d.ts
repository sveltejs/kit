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

export type EndpointOutput<Body extends DefaultBody = DefaultBody> = {
	status?: number;
	headers?: Partial<Headers>;
	body?: Body;
};

export type RequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody
> = (request: ServerRequest<Locals, Input>) => MaybePromise<void | EndpointOutput<Output>>;
