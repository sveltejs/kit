declare module '__GENERATED__/server-internal.js' {
	export const options: import('types').SSROptions;
	export const get_hooks: () => Promise<{
		handle?: import('types').Handle;
		handleError?: import('types').HandleServerError;
		handleFetch?: import('types').HandleFetch;
	}>;
}
