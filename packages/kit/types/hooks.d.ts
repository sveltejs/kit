import { Headers, Location, MaybePromise, ParameterizedBody } from './helper';

export type StrictBody = string | Uint8Array | null;

export type Incoming = Omit<Location, 'params'> & {
	method: string;
	headers: Headers;
	rawBody: StrictBody;
	body?: ParameterizedBody;
};

export type ServerRequest<Locals = Record<string, any>, Body = unknown> = Location & {
	method: string;
	headers: Headers;
	rawBody: StrictBody;
	body: ParameterizedBody<Body>;
	locals: Locals;
};

export type ServerResponse = {
	status: number;
	headers: Headers;
	body?: StrictBody;
};

export type GetSession<Locals = Record<string, any>, Session = any> = {
	(request: ServerRequest<Locals>): MaybePromise<Session>;
};

export type Handle<Locals = Record<string, any>> = (input: {
	request: ServerRequest<Locals>;
	resolve: (request: ServerRequest<Locals>) => MaybePromise<ServerResponse>;
}) => MaybePromise<ServerResponse>;

export type ServerFetch = (req: Request) => Promise<Response>;
