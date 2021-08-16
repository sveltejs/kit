import { ServerRequest } from './hooks';
import { Headers, MaybePromise } from './helper';

type ToJSON = { toJSON(...args: any[]): JSONValue };
type JSONValue = Exclude<JSONResponse, ToJSON>;
type JSONResponse =
	| string
	| number
	| boolean
	| null
	| JSONResponse[]
	| ToJSON
	| { [key: string]: JSONResponse };

type DefaultBody = JSONResponse | Uint8Array;

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
