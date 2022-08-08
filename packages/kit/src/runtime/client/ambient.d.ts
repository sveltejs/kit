declare module '__GENERATED__/client-manifest.js' {
	import { CSRPageNodeLoader, ParamMatcher } from 'types';

	/**
	 * A list of all the error/layout/page nodes used in the app
	 */
	export const nodes: CSRPageNodeLoader[];

	/**
	 * A map of `[routeId: string]: [a, b, has_endpoint]` tuples, which
	 * is parsed into an array of routes on startup
	 */
	export const dictionary: Record<string, [number[], number[], 1]>;

	export const matchers: Record<string, ParamMatcher>;
}
