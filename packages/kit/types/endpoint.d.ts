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

export interface RequestHandler<
	Locals = Record<string, any>,
	Platform = Record<string, any>,
	Output extends Body = Body
> {
	(event: RequestEvent<Locals, Platform>): MaybePromise<
		Either<Response | EndpointOutput<Output>, Fallthrough>
	>;
}
