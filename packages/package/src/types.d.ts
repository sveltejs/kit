import { PreprocessorGroup } from 'svelte/types/compiler/preprocess';

export interface Options {
	cwd: string;
	input: string;
	output: string;
	preserve_output: boolean;
	types: boolean;
	tsconfig?: string;
	config: {
		alias?: Record<string, string>;
		extensions?: string[];
		/** @deprecated SvelteKit 2 had this, which we still support */
		files?: {
			/** @deprecated SvelteKit 2 had this, which we still support */
			lib?: string;
		};
		outDir?: string;
		preprocess?: PreprocessorGroup;
	};
}

export interface File {
	name: string;
	dest: string;
	base: string;
	is_svelte: boolean;
}

export type RecursiveRequired<T> = {
	// Recursive implementation of TypeScript's Required utility type.
	// Will recursively continue until it reaches a primitive or Function
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	[K in keyof T]-?: Extract<T[K], Function> extends never // If it does not have a Function type
		? RecursiveRequired<T[K]> // recursively continue through.
		: T[K]; // Use the exact type for everything else
};

export interface ValidatedConfig {
	extensions: string[];
	kit?: any;
	preprocess?: any;
}

export type Validator<T = any> = (input: T, keypath: string) => T;
