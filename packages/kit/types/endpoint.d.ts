import { RequestEvent } from './hooks';
import { JSONString, MaybePromise, ResponseHeaders, Either, Fallthrough } from './helper';

type DefaultBody = JSONString | Uint8Array;

export interface EndpointOutput<Body extends DefaultBody = DefaultBody> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Body;
}

export interface RequestHandler<
	Locals = Record<string, any>,
	Output extends DefaultBody = DefaultBody
> {
	(request: RequestEvent<Locals>): MaybePromise<
		Either<Response | EndpointOutput<Output>, Fallthrough>
	>;
}
