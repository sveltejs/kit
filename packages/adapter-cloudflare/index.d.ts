/// <reference types="@cloudflare/workers-types" />

import { Adapter, RequestHandler } from '@sveltejs/kit';
import { BuildOptions } from 'esbuild';
import { DefaultBody } from '@sveltejs/kit/types/endpoint';

export default function (options?: BuildOptions): Adapter;

// TODO: Does not work (is the normal Request)
type CfRequest = Parameters<ExportedHandlerFetchHandler>[0];

export type AdapterRequest<Env = unknown> = {
	request: CfRequest;
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
