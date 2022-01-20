import { RequestEvent } from './hooks';
import { Either, JSONString, MaybePromise, ResponseHeaders } from './helper';

type DefaultBody = JSONString | Uint8Array;

export interface EndpointOutput<Body extends DefaultBody = DefaultBody> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Body;
}

export interface Fallthrough {
	fallthrough: true;
}

export interface RequestHandler<
	Locals = Record<string, any>,
	Output extends DefaultBody = DefaultBody
> {
	(request: RequestEvent<Locals>): MaybePromise<
		Either<Response | EndpointOutput<Output>, Fallthrough>
	>;
}
