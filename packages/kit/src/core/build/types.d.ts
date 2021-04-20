export type ClientManifest = Record<
	string,
	{
		file: string;
		css: string[];
		imports: string[];
	}
>;
