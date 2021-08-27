import { IncomingRequest, ParameterizedBody } from './app';
import { MaybePromise, ResponseHeaders } from './helper';

export type StrictBody = string | Uint8Array;

export interface Request<Locals = Record<string, any>, Body = unknown> extends IncomingRequest {
	params: Record<string, string>;
	body: ParameterizedBody<Body>;
	locals: Locals;
}

export interface Response {
	status: number;
	headers: ResponseHeaders;
	body?: StrictBody;
}

export interface GetSession<Locals = Record<string, any>, Session = any> {
	(request: Request<Locals>): MaybePromise<Session>;
}

export interface Handle<Locals = Record<string, any>> {
	(input: {
		request: Request<Locals>;
		resolve(request: Request<Locals>): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleError<Locals = Record<string, any>> {
	(input: { error: Error & { frame?: string }; request: Request<Locals> }): void;
}

export interface ExternalFetch {
	(req: globalThis.Request): Promise<globalThis.Response>;
}
