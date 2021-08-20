import { IncomingRequest, ParameterizedBody } from './app';
import { ResponseHeaders, MaybePromise } from './helper';

export type StrictBody = string | Uint8Array;

export interface ServerRequest<Locals = Record<string, any>, Body = unknown>
	extends IncomingRequest {
	params: Record<string, string>;
	body: ParameterizedBody<Body>;
	locals: Locals;
}

export interface ServerResponse {
	status: number;
	headers: ResponseHeaders;
	body?: StrictBody;
}

export interface GetSession<Locals = Record<string, any>, Session = any> {
	(request: ServerRequest<Locals>): MaybePromise<Session>;
}

export interface Handle<Locals = Record<string, any>> {
	(input: {
		request: ServerRequest<Locals>;
		resolve(request: ServerRequest<Locals>): MaybePromise<ServerResponse>;
	}): MaybePromise<ServerResponse>;
}

export interface HandleError<Locals = Record<string, any>> {
	(input: { error: Error & { frame?: string }; request: ServerRequest<Locals> }): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
