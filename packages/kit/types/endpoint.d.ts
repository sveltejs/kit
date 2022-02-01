import { RequestEvent } from './hooks';
import { Either, JSONString, MaybePromise, ResponseHeaders } from './helper';

type Body = JSONString | Uint8Array | ReadableStream | import('stream').Readable;

export interface EndpointOutput<Output extends Body = Body> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Output;
}

export interface Fallthrough {
	fallthrough: true;
}

export interface RequestHandler<Output extends Body = Body> {
	(event: RequestEvent): MaybePromise<Either<Response | EndpointOutput<Output>, Fallthrough>>;
}
