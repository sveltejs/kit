import { IncomingRequest, ParameterizedBody } from './app';
import { Either, MaybePromise, ResponseHeaders } from './helper';

export type StrictBody = string | Uint8Array;

export interface ServerRequest<
	Locals = Record<string, any>,
	Body = unknown,
	AdapterRequest = unknown
> extends IncomingRequest<AdapterRequest> {
	params: Record<string, string>;
	body: ParameterizedBody<Body>;
	locals: Locals;
}

export type ServerResponseNormal = {
	status: number;
	headers: ResponseHeaders;
	body?: StrictBody;
};

export type ServerResponseAdapterResponse<AdapterResponse = unknown> = {
	adapter: AdapterResponse;
};

export type ServerResponse<AdapterResponse = unknown> = Either<
	ServerResponseNormal,
	ServerResponseAdapterResponse<AdapterResponse>
>;

export interface GetSession<
	Locals = Record<string, any>,
	Body = unknown,
	Session = any,
	AdapterRequest = unknown
> {
	(request: ServerRequest<Locals, Body, AdapterRequest>): MaybePromise<Session>;
}

export interface Handle<
	Locals = Record<string, any>,
	Body = unknown,
	AdapterRequest = unknown,
	AdapterResponse = unknown
> {
	(input: {
		request: ServerRequest<Locals, Body, AdapterRequest>;
		resolve(
			request: ServerRequest<Locals, Body, AdapterRequest>
		): MaybePromise<ServerResponse<AdapterResponse>>;
	}): MaybePromise<ServerResponse<AdapterResponse>>;
}

export interface HandleError<
	Locals = Record<string, any>,
	Body = unknown,
	AdapterRequest = unknown
> {
	(input: {
		error: Error & { frame?: string };
		request: ServerRequest<Locals, Body, AdapterRequest>;
	}): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
