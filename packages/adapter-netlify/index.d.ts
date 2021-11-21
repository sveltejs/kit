import { Adapter, RequestHandler } from '@sveltejs/kit';
import { BuildOptions } from 'esbuild';
import { HandlerEvent, HandlerContext, Handler } from '@netlify/functions';
import { DefaultBody } from '@sveltejs/kit/types/endpoint';

interface AdapterOptions {
	esbuild?: (options: BuildOptions) => Promise<BuildOptions> | BuildOptions;
}

export default function (options?: AdapterOptions): Adapter;

export interface AdapterRequest<Context extends HandlerContext = HandlerContext> {
	event: HandlerEvent;
	context: Context;
}

export interface AdapterResponse {
	response: ReturnType<Handler>;
}

export type AdapterRequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody
> = RequestHandler<Locals, Input, Output, AdapterRequest, AdapterResponse>;
