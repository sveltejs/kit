import { BaseBody, Headers, MaybePromise } from './helper';
import { ServerRequest } from './endpoint';

export type Incoming = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	query: URLSearchParams;
	rawBody: string | Uint8Array;
	body?: BaseBody;
};

export type ServerResponse = {
	status: number;
	headers: Headers;
	body?: string | Uint8Array;
};

export type GetSession<Locals = Record<string, any>, Session = any> = {
	(request: ServerRequest<Locals>): MaybePromise<Session>;
};

export type Handle<Locals = Record<string, any>> = (input: {
	request: ServerRequest<Locals>;
	render: (request: ServerRequest<Locals>) => MaybePromise<ServerResponse>;
}) => MaybePromise<ServerResponse>;
