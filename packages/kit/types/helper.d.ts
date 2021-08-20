interface ReadOnlyFormData {
	get(key: string): string;
	getAll(key: string): string[];
	has(key: string): boolean;
	entries(): Generator<[string, string], void>;
	keys(): Generator<string, void>;
	values(): Generator<string, void>;
	[Symbol.iterator](): Generator<[string, string], void>;
}

export type RequestHeaders = Record<string, string>;

/** Only value that can be an array is set-cookie. For everything else we assume string value */
export type ResponseHeaders = Record<string, string | string[]>;

// Utility Types
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
