export type Options = {
	name: string;
	template: 'default' | 'skeleton';
	typescript: boolean;
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
