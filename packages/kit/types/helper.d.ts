interface ReadOnlyFormData {
	get(key: string): string;
	getAll(key: string): string[];
	has(key: string): boolean;
	entries(): Generator<[string, string], void>;
	keys(): Generator<string, void>;
	values(): Generator<string, void>;
	[Symbol.iterator](): Generator<[string, string], void>;
}

type ToJSON = { toJSON(...args: any[]): JSONValue };
type JSONValue = Exclude<JSONString, ToJSON>;
export type JSONString =
	| string
	| number
	| boolean
	| null
	| ToJSON
	| JSONString[]
	| { [key: string]: JSONString };

/** `string[]` is only for set-cookie, everything else must be type of `string` */
export type ResponseHeaders = Record<string, string | string[]>;
export type RequestHeaders = Record<string, string>;

// Utility Types
export type InferValue<T, Key extends keyof T, Default> = T extends Record<Key, infer Val>
	? Val
	: Default;
export type MaybePromise<T> = T | Promise<T>;
export type Rec<T = any> = Record<string, T>;
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
