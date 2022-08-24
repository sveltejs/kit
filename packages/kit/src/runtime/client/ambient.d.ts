declare module '__GENERATED__/client-manifest.js' {
	import { CSRPageNodeLoader, ParamMatcher } from 'types';

	/**
	 * A list of all the error/layout/page nodes used in the app
	 */
	export const nodes: CSRPageNodeLoader[];

	/**
	 * A map of `[routeId: string]: [leaf, layouts, errors]` tuples, which
	 * is parsed into an array of routes on startup. The numbers refer to the
	 * indices in `nodes`. The route layout and error nodes are not referenced,
	 * they are always number 0 and 1 and always apply.
	 */
	export const dictionary: Record<string, [leaf: number, layouts?: number[], errors?: number[]]>;

	export const matchers: Record<string, ParamMatcher>;
}
