import { ServerRequest } from './hooks';
import { Headers, MaybePromise } from './helper';

/**
 * Represents plain JSON, can be returned from an endpoint
 * or from parsing a JSON string
 */
type PlainJSON = Exclude<JSONValue, ToJSON>;

/**
 * Type for objects that aren't plain JSON values, but can be converted to one
 */
type ToJSON = { toJSON(...args: unknown[]): PlainJSON };

/**
 * JSON output that can be retrieved from an endpoint
 */
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
