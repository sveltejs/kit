export type Options = {
	name: string;
	template: 'default' | 'skeleton' | 'skeletonlib';
	types: 'typescript' | 'checkjs' | null;
	prettier: boolean;
	eslint: boolean;
	playwright: boolean;
	vitest: boolean;
	svelte5?: boolean; // optional to not introduce a breaking change to the `create` API
};

export type File = {
	name: string;
	contents: string;
};

export type Condition =
	| 'eslint'
	| 'prettier'
	| 'typescript'
	| 'checkjs'
	| 'playwright'
	| 'vitest'
	| 'skeleton'
	| 'default'
	| 'skeletonlib'
	| 'svelte5';

export type Common = {
	files: Array<{
		name: string;
		include: Condition[];
		exclude: Condition[];
		contents: string;
	}>;
};
