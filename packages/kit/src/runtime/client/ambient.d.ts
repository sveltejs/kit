declare module '__GENERATED__/client-manifest.js' {
	import { CSRPageNodeLoader, ClientHooks, ParamMatcher } from 'types';

	/**
	 * A list of all the error/layout/page nodes used in the app
	 */
	export const nodes: CSRPageNodeLoader[];

	/**
	 * A list of all layout node ids that have a server load function.
	 * Pages are not present because it's shorter to encode it on the leaf itself.
	 */
	export const server_loads: number[];

	/**
	 * A map of `[routeId: string]: [leaf, layouts, errors]` tuples, which
	 * is parsed into an array of routes on startup. The numbers refer to the indices in `nodes`.
	 * If the leaf number is negative, it means it does use a server load function and the complement is the node index.
	 * The route layout and error nodes are not referenced, they are always number 0 and 1 and always apply.
	 */
	export const dictionary: Record<string, [leaf: number, layouts: number[], errors?: number[]]>;

	export const matchers: Record<string, ParamMatcher>;

	export const hooks: ClientHooks;
}

declare module '__GENERATED__/root.svelte' {
	export { SvelteComponent as default } from 'svelte';
}
