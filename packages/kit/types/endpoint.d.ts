import { ServerRequest } from './hooks';
import { Either, JSONString, MaybePromise, ResponseHeaders } from './helper';

type DefaultBody = JSONString | Uint8Array;

export type EndpointOutputNormal<Body extends DefaultBody = DefaultBody> = {
	status?: number;
	headers?: ResponseHeaders;
	body?: Body;
};

export type EndpointOutputAdapterResponse<AdapterResponse = unknown> = {
	adapter: AdapterResponse;
};

export type EndpointOutput<
	Body extends DefaultBody = DefaultBody,
	AdapterResponse = unknown
> = Either<EndpointOutputNormal<Body>, EndpointOutputAdapterResponse<AdapterResponse>>;

export interface RequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody,
	AdapterRequest = unknown,
	AdapterResponse = unknown
> {
	(request: ServerRequest<Locals, Input, AdapterRequest>): MaybePromise<void | EndpointOutput<
		Output,
		AdapterResponse
	>>;
}
