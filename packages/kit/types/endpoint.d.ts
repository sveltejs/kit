import { ServerRequest } from './hooks';
import { JSONString, MaybePromise, ResponseHeaders, Either, Fallthrough } from './helper';

type DefaultBody = JSONString | Uint8Array;

export interface EndpointOutput<Body extends DefaultBody = DefaultBody> {
	status?: number;
	headers?: Partial<ResponseHeaders>;
	body?: Body;
}

export interface RequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody
> {
	(request: ServerRequest<Locals, Input>): MaybePromise<
		Either<EndpointOutput<Output>, Fallthrough>
	>;
}
