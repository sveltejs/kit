declare module '__SERVER__/internal.js' {
	export const options: import('types').SSROptions;
	export const get_hooks: () => Promise<{
		handle?: import('@sveltejs/kit').Handle;
		handleError?: import('@sveltejs/kit').HandleServerError;
		handleFetch?: import('@sveltejs/kit').HandleFetch;
	}>;
}
