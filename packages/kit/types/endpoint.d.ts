import { RequestEvent } from './hooks';
import { Either, JSONObject, JSONValue, MaybePromise, ResponseHeaders } from './helper';

type Body = JSONValue | Uint8Array | ReadableStream | import('stream').Readable;

export interface EndpointOutput<Output extends Body = Body> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Output;
}

export interface Fallthrough {
	fallthrough: true;
}

export interface RequestHandler<Output extends Body = Body> {
	(event: RequestEvent): MaybePromise<
		Either<Output extends Response ? Response : EndpointOutput<Output>, Fallthrough>
	>;
}

export interface ShadowEndpointOutput<Output extends JSONObject = JSONObject> {
	status?: number;
	headers?: Partial<ResponseHeaders>;
	body?: Output;
}

export interface ShadowRequestHandler<Output extends JSONObject = JSONObject> {
	(event: RequestEvent): MaybePromise<Either<ShadowEndpointOutput<Output>, Fallthrough>>;
}

export interface ShadowData {
	fallthrough?: boolean;
	status?: number;
	error?: Error;
	redirect?: string;
	cookies?: string[];
	body?: JSONObject;
}
