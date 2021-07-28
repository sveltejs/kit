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

export interface EndpointOutput<Body extends DefaultBody = DefaultBody> {
	status?: number;
	headers?: Headers;
	body?: Body;
}

export interface RequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody
> {
	(request: ServerRequest<Locals, Input>): MaybePromise<void | EndpointOutput<Output>>;
}
