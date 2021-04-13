export type Options = {
	typescript: boolean;
	prettier: boolean;
	eslint: boolean;
};

export type Template = {
	meta: {
		description: string;
	};
	files: Array<{
		name: string;
		contents: string;
		encoding: 'base64' | 'utf8';
	}>;
};

export type Common = {
	files: Array<{
		name: string;
		include: Array<'eslint' | 'prettier' | 'typescript'>;
		exclude: Array<'eslint' | 'prettier' | 'typescript'>;
		contents: string;
	}>;
};
