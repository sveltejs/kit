interface ReadOnlyFormData {
	get(key: string): string;
	getAll(key: string): string[];
	has(key: string): boolean;
	entries(): Generator<[string, string], void>;
	keys(): Generator<string, void>;
	values(): Generator<string, void>;
	[Symbol.iterator](): Generator<[string, string], void>;
}

/** `string[]` is only for set-cookie, everything else must be type of `string` */
export type ResponseHeaders = Record<string, string | string[]>;
export type RequestHeaders = Record<string, string>;

// Utility Types
export type InferValue<T, Key extends keyof T, Default> = T extends Record<Key, infer Val>
	? Val
	: Default;
export type MaybePromise<T> = T | Promise<T>;
export type Rec<T = any> = Record<string, T>;
export type DeepPartial<T> = {
	[K in keyof T]?: DeepPartial<T[K]>;
};
