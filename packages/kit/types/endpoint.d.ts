import { ServerRequest } from './hooks';
import { Headers, MaybePromise } from './helper';

type Excluded = Exclude<JSONValue, ToJSON>;
type ToJSON = { toJSON(...args: unknown[]): Excluded };
type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| ToJSON
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
