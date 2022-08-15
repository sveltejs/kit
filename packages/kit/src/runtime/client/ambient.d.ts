declare module '__GENERATED__/client-manifest.js' {
	import { CSRPageNodeLoader, ParamMatcher } from 'types';

	/**
	 * A list of all the error/layout/page nodes used in the app
	 */
	export const nodes: CSRPageNodeLoader[];

	/**
	 * A map of `[routeId: string]: [errors, layouts, page]` tuples, which
	 * is parsed into an array of routes on startup. The numbers refer to the
	 * indices in `nodes`.
	 */
	export const dictionary: Record<string, [number[], number[], number]>;

	export const matchers: Record<string, ParamMatcher>;
}
