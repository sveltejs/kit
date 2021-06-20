declare function plugin(options?: {
	out?: string;
	precompress?: boolean;
}): import('@sveltejs/kit').Adapter;

export = plugin;
