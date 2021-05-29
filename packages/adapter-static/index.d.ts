declare function plugin(options?: {
	pages?: string;
	assets?: string;
	fallback?: string;
}): import('@sveltejs/kit').Adapter;

export = plugin;
