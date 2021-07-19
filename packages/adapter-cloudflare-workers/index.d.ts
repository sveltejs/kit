type BuildOptions = import('esbuild').BuildOptions;
declare function plugin(options?: {
	esbuild?: (defaultOptions: BuildOptions) => Promise<BuildOptions> | BuildOptions;
}): import('@sveltejs/kit').Adapter;

export = plugin;
