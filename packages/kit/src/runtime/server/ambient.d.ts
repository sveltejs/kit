declare module '__SERVER__/internal.js' {
	export const options: import('types').SSROptions;
	export const get_hooks: () => Promise<Partial<import('types').ServerHooks>>;
	export const dictionary: Record<string, import('types').CSRRoute>;
}
