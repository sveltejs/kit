/// <reference types="@cloudflare/workers-types" />

import { Adapter, RequestHandler } from '@sveltejs/kit';
import { BuildOptions } from 'esbuild';
import { DefaultBody } from '@sveltejs/kit/types/endpoint';

export default function (options?: BuildOptions): Adapter;

// TODO: Why do I have to copy paste that and cannot use the one direclty from @cloudflare/workers-types
declare class Request extends Body {
	constructor(input: Request | string, init?: RequestInit | Request);
	clone(): Request;
	readonly method: string;
	readonly url: string;
	readonly headers: Headers;
	readonly redirect: string;
	readonly fetcher: Fetcher | null;
	readonly signal: AbortSignal;
	readonly cf?: IncomingRequestCfProperties;
}

export type AdapterRequest<Env = unknown> = {
	request: Request;
	env: Env;
	ctx: ExecutionContext;
};

export interface AdapterResponse {
	response: ReturnType<ExportedHandlerFetchHandler>;
}

export type AdapterRequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody,
	Env = unknown
> = RequestHandler<Locals, Input, Output, AdapterRequest<Env>, AdapterResponse>;
