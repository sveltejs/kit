import { IncomingRequest, ParameterizedBody } from './app';
import { MaybePromise, ResponseHeaders } from './helper';

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

export interface GetSession<Locals = Record<string, any>, Body = unknown, Session = any> {
	(request: ServerRequest<Locals, Body>): MaybePromise<Session>;
}

export interface Handle<Locals = Record<string, any>, Body = unknown> {
	(input: {
		request: ServerRequest<Locals, Body>;
		resolve(request: ServerRequest<Locals, Body>): MaybePromise<ServerResponse>;
	}): MaybePromise<ServerResponse>;
}

export interface HandleError<Locals = Record<string, any>, Body = unknown> {
	(input: { error: Error & { frame?: string }; request: ServerRequest<Locals, Body> }): void;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
