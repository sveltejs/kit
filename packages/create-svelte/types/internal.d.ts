export type Options = {
	template: 'default' | 'skeleton';
	typescript: boolean;
	prettier: boolean;
	eslint: boolean;
};

export type File = {
	name: string;
	contents: string;
};

export type Condition = 'eslint' | 'prettier' | 'typescript' | 'skeleton' | 'default';

export type Common = {
	files: Array<{
		name: string;
		include: Array<Condition>;
		exclude: Array<Condition>;
		contents: string;
	}>;
};
