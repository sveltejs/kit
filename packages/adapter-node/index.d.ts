declare function plugin(options?: {precompress?: boolean} & import('esbuild').BuildOptions): import('@sveltejs/kit').Adapter;

export = plugin;
