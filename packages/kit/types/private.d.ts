// This module contains types that are visible in the documentation,
// but which cannot be imported from `@sveltejs/kit`. Care should
// be taken to avoid breaking changes when editing this file

import { PrerenderErrorHandler } from './index';

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

export type Either<T, U> = Only<T, U> | Only<U, T>;

export interface Fallthrough {
	fallthrough: true;
}

export type HttpMethod = 'get' | 'head' | 'post' | 'put' | 'delete' | 'patch';

export type JSONObject = { [key: string]: JSONValue };

export type JSONValue = string | number | boolean | null | ToJSON | JSONValue[] | JSONObject;

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

export type PrerenderOnErrorValue = 'fail' | 'continue' | PrerenderErrorHandler;

export type RecursiveRequired<T> = {
	// Recursive implementation of TypeScript's Required utility type.
	// Will recursively continue until it reaches primitive or union
	// with a Function in it, except those commented below
	[K in keyof T]-?: Extract<T[K], Function> extends never // If it does not have a Function type
		? RecursiveRequired<T[K]> // recursively continue through.
		: K extends 'vite' // If it reaches the 'vite' key
		? Extract<T[K], Function> // only take the Function type.
		: T[K]; // Use the exact type for everything else
};

export interface RequiredResolveOptions {
	ssr: boolean;
	transformPage: ({ html }: { html: string }) => MaybePromise<string>;
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

export type ToJSON = { toJSON(...args: any[]): Exclude<JSONValue, ToJSON> };

export type TrailingSlash = 'never' | 'always' | 'ignore';
