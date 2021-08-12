import { ServerRequest } from './hooks';
import { Headers, MaybePromise } from './helper';

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

type JSONBody =
	| string
	| number
	| boolean
	| null
	| JSONBody[]
	| { toJSON(...args: unknown[]): JSONValue }
	| { [key: string]: JSONBody };

type DefaultBody = JSONBody | Uint8Array;

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
