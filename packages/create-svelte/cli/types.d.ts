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
