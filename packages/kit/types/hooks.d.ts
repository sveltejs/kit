import { BaseBody, Headers } from './helper';
import { ServerRequest, ServerResponse } from './endpoint';

export type Incoming = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	query: URLSearchParams;
	body: BaseBody;
};

export type GetContext<Context = any> = (incoming: Incoming) => Context;

export type GetSession<Context = any, Session = any> = {
	({ context }: { context: Context }): Session | Promise<Session>;
};

export type Handle<Context = any> = (input: {
	request: ServerRequest<Context>;
	render: (request: ServerRequest<Context>) => ServerResponse | Promise<ServerResponse>;
}) => ServerResponse | Promise<ServerResponse>;
