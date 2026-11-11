/** @import { TsFacade } from './facade.js' */

/**
 * Creates the TypeScript 6 (and 5) implementation of the facade.
 * The facade has the signatures of TypeScript 6, so this is simply its `ts` namespace.
 * @param {typeof import('typescript')} ts
 * @returns {TsFacade}
 */
export function create_ts6_facade(ts) {
	return ts;
}
