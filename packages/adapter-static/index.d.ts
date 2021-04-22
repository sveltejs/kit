declare function plugin(options: {
	pages?: string;
	assets?: string;
}): import('@sveltejs/kit').Adapter;

export = plugin;
