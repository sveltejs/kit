// This module contains types that are visible in the documentation,
// but which cannot be imported from `@sveltejs/kit`. Care should
// be taken to avoid breaking changes when editing this file

import { SSRNodeLoader, SSRRoute } from './internal';

export interface AdapterEntry {
	/**
	 * A string that uniquely identifies an HTTP service (e.g. serverless function) and is used for deduplication.
	 * For example, `/foo/a-[b]` and `/foo/[c]` are different routes, but would both
	 * be represented in a Netlify _redirects file as `/foo/:param`, so they share an ID
	 */
	id: string;

	/**
	 * A function that compares the candidate route with the current route to determine
	 * if it should be treated as a fallback for the current route. For example, `/foo/[c]`
	 * is a fallback for `/foo/a-[b]`, and `/[...catchall]` is a fallback for all routes
	 */
	filter: (route: RouteDefinition) => boolean;

	/**
	 * A function that is invoked once the entry has been created. This is where you
	 * should write the function to the filesystem and generate redirect manifests.
	 */
	complete: (entry: {
		generateManifest: (opts: { relativePath: string; format?: 'esm' | 'cjs' }) => string;
	}) => void;
}

export type Body = JSONValue | Uint8Array | ReadableStream | import('stream').Readable;

export interface Builder {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;

	appDir: string;
	trailingSlash: TrailingSlash;

	/**
	 * Create entry points that map to individual functions
	 * @param fn A function that groups a set of routes into an entry point
	 */
	createEntries(fn: (route: RouteDefinition) => AdapterEntry): void;

	generateManifest: (opts: { relativePath: string; format?: 'esm' | 'cjs' }) => string;

	getBuildDirectory(name: string): string;
	getClientDirectory(): string;
	getServerDirectory(): string;
	getStaticDirectory(): string;

	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeClient(dest: string): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeServer(dest: string): string[];
	/**
	 * @param dest the destination folder to which files should be copied
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	writeStatic(dest: string): string[];
	/**
	 * @param from the source file or folder
	 * @param to the destination file or folder
	 * @param opts.filter a function to determine whether a file or folder should be copied
	 * @param opts.replace a map of strings to replace
	 * @returns an array of paths corresponding to the files that have been created by the copy
	 */
	copy(
		from: string,
		to: string,
		opts?: {
			filter?: (basename: string) => boolean;
			replace?: Record<string, string>;
		}
	): string[];

	prerender(options: { all?: boolean; dest: string; fallback?: string }): Promise<Prerendered>;
}

// Based on https://github.com/josh-hemphill/csp-typed-directives/blob/latest/src/csp.types.ts
//
// MIT License
//
// Copyright (c) 2021-present, Joshua Hemphill
// Copyright (c) 2021, Tecnico Corporation
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export namespace Csp {
	type ActionSource = 'strict-dynamic' | 'report-sample';
	type BaseSource = 'self' | 'unsafe-eval' | 'unsafe-hashes' | 'unsafe-inline' | 'none';
	type CryptoSource = `${'nonce' | 'sha256' | 'sha384' | 'sha512'}-${string}`;
	type FrameSource = HostSource | SchemeSource | 'self' | 'none';
	type HostNameScheme = `${string}.${string}` | 'localhost';
	type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;
	type HostProtocolSchemes = `${string}://` | '';
	type HttpDelineator = '/' | '?' | '#' | '\\';
	type PortScheme = `:${number}` | '' | ':*';
	type SchemeSource = 'http:' | 'https:' | 'data:' | 'mediastream:' | 'blob:' | 'filesystem:';
	type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
	type Sources = Source[];
	type UriPath = `${HttpDelineator}${string}`;
}

export interface CspDirectives {
	'child-src'?: Csp.Sources;
	'default-src'?: Array<Csp.Source | Csp.ActionSource>;
	'frame-src'?: Csp.Sources;
	'worker-src'?: Csp.Sources;
	'connect-src'?: Csp.Sources;
	'font-src'?: Csp.Sources;
	'img-src'?: Csp.Sources;
	'manifest-src'?: Csp.Sources;
	'media-src'?: Csp.Sources;
	'object-src'?: Csp.Sources;
	'prefetch-src'?: Csp.Sources;
	'script-src'?: Array<Csp.Source | Csp.ActionSource>;
	'script-src-elem'?: Csp.Sources;
	'script-src-attr'?: Csp.Sources;
	'style-src'?: Array<Csp.Source | Csp.ActionSource>;
	'style-src-elem'?: Csp.Sources;
	'style-src-attr'?: Csp.Sources;
	'base-uri'?: Array<Csp.Source | Csp.ActionSource>;
	sandbox?: Array<
		| 'allow-downloads-without-user-activation'
		| 'allow-forms'
		| 'allow-modals'
		| 'allow-orientation-lock'
		| 'allow-pointer-lock'
		| 'allow-popups'
		| 'allow-popups-to-escape-sandbox'
		| 'allow-presentation'
		| 'allow-same-origin'
		| 'allow-scripts'
		| 'allow-storage-access-by-user-activation'
		| 'allow-top-navigation'
		| 'allow-top-navigation-by-user-activation'
	>;
	'form-action'?: Array<Csp.Source | Csp.ActionSource>;
	'frame-ancestors'?: Array<Csp.HostSource | Csp.SchemeSource | Csp.FrameSource>;
	'navigate-to'?: Array<Csp.Source | Csp.ActionSource>;
	'report-uri'?: Csp.UriPath[];
	'report-to'?: string[];

	'require-trusted-types-for'?: Array<'script'>;
	'trusted-types'?: Array<'none' | 'allow-duplicates' | '*' | string>;
	'upgrade-insecure-requests'?: boolean;

	/** @deprecated */
	'require-sri-for'?: Array<'script' | 'style' | 'script style'>;

	/** @deprecated */
	'block-all-mixed-content'?: boolean;

	/** @deprecated */
	'plugin-types'?: Array<`${string}/${string}` | 'none'>;

	/** @deprecated */
	referrer?: Array<
		| 'no-referrer'
		| 'no-referrer-when-downgrade'
		| 'origin'
		| 'origin-when-cross-origin'
		| 'same-origin'
		| 'strict-origin'
		| 'strict-origin-when-cross-origin'
		| 'unsafe-url'
		| 'none'
	>;
}

export type Either<T, U> = Only<T, U> | Only<U, T>;

export interface ErrorLoadInput<Params = Record<string, string>> extends LoadInput<Params> {
	status?: number;
	error?: Error;
}

export interface Fallthrough {
	fallthrough: true;
}

export type HttpMethod = 'get' | 'head' | 'post' | 'put' | 'delete' | 'patch';

export interface JSONObject {
	[key: string]: JSONValue;
}

export type JSONValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| ToJSON
	| JSONValue[]
	| JSONObject;

export interface LoadInput<Params = Record<string, string>, Props = Record<string, any>> {
	url: URL;
	params: Params;
	props: Props;
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	session: App.Session;
	stuff: Partial<App.Stuff>;
}

export interface LoadOutput<Props = Record<string, any>> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	stuff?: Partial<App.Stuff>;
	maxage?: number;
}

export interface Logger {
	(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
	warn(msg: string): void;
	minor(msg: string): void;
	info(msg: string): void;
}

export type MaybePromise<T> = T | Promise<T>;

export type Only<T, U> = { [P in keyof T]: T[P] } & { [P in Exclude<keyof U, keyof T>]?: never };

export interface Prerendered {
	pages: Map<
		string,
		{
			/** The location of the .html file relative to the output directory */
			file: string;
		}
	>;
	assets: Map<
		string,
		{
			/** The MIME type of the asset */
			type: string;
		}
	>;
	redirects: Map<
		string,
		{
			status: number;
			location: string;
		}
	>;
	/** An array of prerendered paths (without trailing slashes, regardless of the trailingSlash config) */
	paths: string[];
}

export interface PrerenderErrorHandler {
	(details: {
		status: number;
		path: string;
		referrer: string | null;
		referenceType: 'linked' | 'fetched';
	}): void;
}

export type PrerenderOnErrorValue = 'fail' | 'continue' | PrerenderErrorHandler;

export interface RequestEvent<Params = Record<string, string>> {
	request: Request;
	url: URL;
	params: Params;
	locals: App.Locals;
	platform: Readonly<App.Platform>;
}

export interface RequestOptions {
	platform?: App.Platform;
}

export interface ResolveOptions {
	ssr?: boolean;
	transformPage?: ({ html }: { html: string }) => MaybePromise<string>;
}

/** `string[]` is only for set-cookie, everything else must be type of `string` */
export type ResponseHeaders = Record<string, string | number | string[]>;

export interface RouteDefinition {
	type: 'page' | 'endpoint';
	pattern: RegExp;
	segments: RouteSegment[];
	methods: HttpMethod[];
}

export interface RouteSegment {
	content: string;
	dynamic: boolean;
	rest: boolean;
}

export class Server {
	constructor(manifest: SSRManifest);
	respond(request: Request, options?: RequestOptions): Promise<Response>;
}

export interface SSRManifest {
	appDir: string;
	assets: Set<string>;
	/** private fields */
	_: {
		mime: Record<string, string>;
		entry: {
			file: string;
			js: string[];
			css: string[];
		};
		nodes: SSRNodeLoader[];
		routes: SSRRoute[];
	};
}

export interface ToJSON {
	toJSON(...args: any[]): Exclude<JSONValue, ToJSON>;
}

export type TrailingSlash = 'never' | 'always' | 'ignore';
