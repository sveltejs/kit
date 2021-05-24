import { Headers, Location, ParameterizedBody } from './helper';

export type Incoming = Omit<Location, 'params'> & {
	method: string;
	headers: Headers;
	rawBody: string | Uint8Array;
	body?: ParameterizedBody;
};

export type ServerRequest<Locals = Record<string, any>, Body = unknown> = Location & {
	method: string;
	headers: Headers;
	rawBody: string | Uint8Array;
	body: ParameterizedBody<Body>;
	locals: Locals;
};

export type ServerResponse = {
	status: number;
	headers: Headers;
	body?: string | Uint8Array;
};

export type GetSession<Locals = Record<string, any>, Session = any> = {
	(request: ServerRequest<Locals>): Session | Promise<Session>;
};

export type Handle<Locals = Record<string, any>> = (input: {
	request: ServerRequest<Locals>;
	render: (request: ServerRequest<Locals>) => ServerResponse | Promise<ServerResponse>;
}) => ServerResponse | Promise<ServerResponse>;
