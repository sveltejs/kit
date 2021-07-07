declare function plugin(options?: {
	out?: string;
	precompress?: boolean;
	env?: {
		host?: string;
		port?: string;
	};
}): import('@sveltejs/kit').Adapter;

export = plugin;
