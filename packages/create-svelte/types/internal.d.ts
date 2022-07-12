export type Options = {
	name: string;
	template: 'default' | 'skeleton';
	types: 'typescript' | 'checkjs' | null;
	prettier: boolean;
	eslint: boolean;
	playwright: boolean;
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
	| 'skeleton'
	| 'default';

export type Common = {
	files: Array<{
		name: string;
		include: Condition[];
		exclude: Condition[];
		contents: string;
	}>;
};
