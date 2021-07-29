type BuildOptions = import('esbuild').BuildOptions;
declare function plugin(options?: {
	out?: string;
	precompress?: boolean;
	env?: {
		host?: string;
		port?: string;
	};
	esbuild?: (defaultOptions: BuildOptions) => Promise<BuildOptions> | BuildOptions;
}): import('@sveltejs/kit').Adapter;

export = plugin;
