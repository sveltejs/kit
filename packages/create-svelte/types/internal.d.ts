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

export type Common = {
	files: Array<{
		name: string;
		include: Array<'eslint' | 'prettier' | 'typescript'>;
		exclude: Array<'eslint' | 'prettier' | 'typescript'>;
		contents: string;
	}>;
};
