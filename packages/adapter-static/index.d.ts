declare function plugin(options?: {
	pages?: string;
	assets?: string;
	fallback?: string | null;
}): import('@sveltejs/kit').Adapter;

export = plugin;
