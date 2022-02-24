/// <reference types="svelte" />
/// <reference types="vite/client" />

import './ambient';

import { CompileOptions } from 'svelte/types/compiler/interfaces';
import {
	Body,
	Builder,
	CspDirectives,
	Either,
	ErrorLoadInput,
	Fallthrough,
	LoadInput,
	LoadOutput,
	MaybePromise,
	PrerenderOnErrorValue,
	RequestEvent,
	ResolveOptions,
	ResponseHeaders,
	TrailingSlash
} from './private';

export interface Adapter {
	name: string;
	adapt(builder: Builder): Promise<void>;
}

export interface Config {
	compilerOptions?: CompileOptions;
	extensions?: string[];
	kit?: {
		adapter?: Adapter;
		amp?: boolean;
		appDir?: string;
		browser?: {
			hydrate?: boolean;
			router?: boolean;
		};
		csp?: {
			mode?: 'hash' | 'nonce' | 'auto';
			directives?: CspDirectives;
		};
		files?: {
			assets?: string;
			hooks?: string;
			lib?: string;
			routes?: string;
			serviceWorker?: string;
			template?: string;
		};
		floc?: boolean;
		inlineStyleThreshold?: number;
		methodOverride?: {
			parameter?: string;
			allowed?: string[];
		};
		package?: {
			dir?: string;
			emitTypes?: boolean;
			exports?(filepath: string): boolean;
			files?(filepath: string): boolean;
		};
		paths?: {
			assets?: string;
			base?: string;
		};
		prerender?: {
			concurrency?: number;
			crawl?: boolean;
			enabled?: boolean;
			entries?: string[];
			onError?: PrerenderOnErrorValue;
		};
		routes?: (filepath: string) => boolean;
		serviceWorker?: {
			register?: boolean;
			files?: (filepath: string) => boolean;
		};
		trailingSlash?: TrailingSlash;
		version?: {
			name?: string;
			pollInterval?: number;
		};
		vite?: import('vite').UserConfig | (() => MaybePromise<import('vite').UserConfig>);
	};
	preprocess?: any;
}

export interface ErrorLoad<Params = Record<string, string>, Props = Record<string, any>> {
	(input: ErrorLoadInput<Params>): MaybePromise<LoadOutput<Props>>;
}

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}

export interface GetSession {
	(event: RequestEvent): MaybePromise<App.Session>;
}

export interface Handle {
	(input: {
		event: RequestEvent;
		resolve(event: RequestEvent, opts?: ResolveOptions): MaybePromise<Response>;
	}): MaybePromise<Response>;
}

export interface HandleError {
	(input: { error: Error & { frame?: string }; event: RequestEvent }): void;
}

export interface Load<Params = Record<string, string>, Props = Record<string, any>> {
	(input: LoadInput<Params>): MaybePromise<Either<Fallthrough, LoadOutput<Props>>>;
}

export interface Page<Params extends Record<string, string> = Record<string, string>> {
	url: URL;
	params: Params;
	stuff: App.Stuff;
	status: number;
	error: Error | null;
}

export interface Navigation {
	from: URL;
	to: URL;
}

/**
 * A function exported from an endpoint that corresponds to an
 * HTTP verb (`get`, `put`, `patch`, etc) and handles requests with
 * that method. Note that since 'delete' is a reserved word in
 * JavaScript, delete handles are called `del` instead.
 */
export interface RequestHandler<Params = Record<string, string>, Output extends Body = Body> {
	(event: RequestEvent<Params>): RequestHandlerOutput<Output>;
}

export type RequestHandlerOutput<Output extends Body = Body> = MaybePromise<
	Either<
		{
			status?: number;
			headers?: Headers | Partial<ResponseHeaders>;
			body?: Output;
		},
		Fallthrough
	>
>;
