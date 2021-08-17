import { RawBody } from './hooks';

interface ReadOnlyFormData {
	get(key: string): string;
	getAll(key: string): string[];
	has(key: string): boolean;
	entries(): Generator<[string, string], void>;
	keys(): Generator<string, void>;
	values(): Generator<string, void>;
	[Symbol.iterator](): Generator<[string, string], void>;
}

type BaseBody = string | RawBody | ReadOnlyFormData;
export type ParameterizedBody<Body = unknown> = Body extends FormData
	? ReadOnlyFormData
	: BaseBody & Body;

// TODO we want to differentiate between request headers, which
// always follow this type, and response headers, in which
// 'set-cookie' is a `string[]` (or at least `string | string[]`)
// but this can't happen until TypeScript 4.3
export type Headers = Record<string, string>;

export type Location<Params extends Record<string, string> = Record<string, string>> = {
	host: string;
	path: string;
	params: Params;
	query: URLSearchParams;
};

export type InferValue<T, Key extends keyof T, Default> = T extends Record<Key, infer Val>
	? Val
	: Default;
export type MaybePromise<T> = T | Promise<T>;
export type Rec<T = any> = Record<string, T>;
export type RecursiveRequired<T> = {
	// Recursive implementation of TypeScript's Required utility type.
	// will continue until it reaches a primitive or union
	// with a Function in it, except for the 'vite' key
	// which we want the end result to be just a function
	[K in keyof T]-?: Extract<T[K], Function> extends never
		? RecursiveRequired<T[K]>
		: K extends 'vite'
		? Extract<T[K], Function>
		: T[K];
};
