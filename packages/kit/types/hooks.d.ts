import { Headers, Location, MaybePromise, ParameterizedBody } from './helper';

export type StrictBody = string | Uint8Array;

export interface ServerRequest<Locals = Record<string, any>, Body = unknown> extends Location {
	method: string;
	headers: Headers;
	rawBody: StrictBody;
	body: ParameterizedBody<Body>;
	locals: Locals;
}

export interface ServerResponse {
	status: number;
	headers: Headers;
	body?: StrictBody;
}

export interface GetSession<Locals = Record<string, any>, Session = any> {
	(request: ServerRequest<Locals>): MaybePromise<Session>;
}

export interface Handle<Locals = Record<string, any>> {
	(input: {
		request: ServerRequest<Locals>;
		resolve: (request: ServerRequest<Locals>) => MaybePromise<ServerResponse>;
	}): MaybePromise<ServerResponse>;
}

export interface ServerFetch {
	(req: Request): Promise<Response>;
}
