declare function plugin(options?: {
	out?: string;
	precompress?: boolean;
	esbuildOptions?: import('esbuild').BuildOptions;
}): import('@sveltejs/kit').Adapter;

export = plugin;
