import { BaseBody, Headers } from './helper';
import { ServerRequest } from './endpoint';

export type Incoming = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	query: URLSearchParams;
	rawBody: string | ArrayBuffer;
	body?: BaseBody;
};

export type GetSession<Locals = Record<string, any>, Session = any> = {
	(request: ServerRequest<Locals>): Session | Promise<Session>;
};

export type Handle<Locals = Record<string, any>> = (input: {
	request: ServerRequest<Locals>;
	render: (request: ServerRequest<Locals>) => ServerResponse | Promise<ServerResponse>;
}) => ServerResponse | Promise<ServerResponse>;

export type ServerResponse = {
	status?: number;
	headers?: Headers;
	body?: string | Uint8Array;
};
