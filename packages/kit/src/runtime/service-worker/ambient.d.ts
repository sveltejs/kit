declare module '__SERVICE_WORKER__/internal.js' {
	export const options: import('types').SWROptions;
	export const get_hooks: () => Promise<Partial<import('types').ClientHooks>>;
}
