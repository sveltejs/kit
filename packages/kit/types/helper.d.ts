type ToJSON = { toJSON(...args: any[]): Exclude<JSONValue, ToJSON> };

export type JSONObject = { [key: string]: JSONValue };
export type JSONValue = string | number | boolean | null | ToJSON | JSONValue[] | JSONObject;

/** `string[]` is only for set-cookie, everything else must be type of `string` */
export type ResponseHeaders = Record<string, string | number | string[]>;

// <-- Utility Types -->
type Only<T, U> = { [P in keyof T]: T[P] } & { [P in Exclude<keyof U, keyof T>]?: never };

export type Either<T, U> = Only<T, U> | Only<U, T>;
export type MaybePromise<T> = T | Promise<T>;
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
