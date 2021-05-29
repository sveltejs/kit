import { Headers, Location, ParameterizedBody } from './helper';

export type StrictBody = string | Uint8Array;

export type Incoming = Omit<Location, 'params'> & {
	method: string;
	headers: Headers;
	rawBody: StrictBody | null;
	body?: ParameterizedBody;
};

export type ServerRequest<Locals = Record<string, any>, Body = unknown> = Location & {
	method: string;
	headers: Headers;
	rawBody: StrictBody | null;
	body: ParameterizedBody<Body>;
	locals: Locals;
};

export type ServerResponse = {
	status: number;
	headers: Headers;
	body?: StrictBody;
};

export type GetSession<Locals = Record<string, any>, Session = any> = {
	(request: ServerRequest<Locals>): Session | Promise<Session>;
};

export type Handle<Locals = Record<string, any>> = (input: {
	request: ServerRequest<Locals>;
	render: (request: ServerRequest<Locals>) => ServerResponse | Promise<ServerResponse>;
}) => ServerResponse | Promise<ServerResponse>;
