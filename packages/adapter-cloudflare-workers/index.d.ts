/// <reference types="@cloudflare/workers-types" />

import { Adapter, RequestHandler } from '@sveltejs/kit';
import { DefaultBody } from '@sveltejs/kit/types/endpoint';
import { BuildOptions } from 'esbuild';

interface AdapterOptions {
	esbuild?: (options: BuildOptions) => Promise<BuildOptions> | BuildOptions;
}

export default function (options?: AdapterOptions): Adapter;

export type AdapterRequest = {
	event: FetchEvent;
};

export interface AdapterResponse {
	response: Parameters<FetchEvent['respondWith']>[0];
}

export type AdapterRequestHandler<
	Locals = Record<string, any>,
	Input = unknown,
	Output extends DefaultBody = DefaultBody
> = RequestHandler<Locals, Input, Output, AdapterRequest, AdapterResponse>;
