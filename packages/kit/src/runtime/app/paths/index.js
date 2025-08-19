import { base, assets } from '__sveltekit/paths';
import { resolve_route } from '../../../utils/routing.js';

/** @type {import('./types.d.ts').asset} */
export function asset(file) {
	return (assets || base) + file;
}

/** @type {import('./types.d.ts').resolve} */
export function resolve(id, params) {
	// The type error is correct here, and if someone doesn't pass params when they should there's a runtime error,
	// but we don't want to adjust the internal resolve_route function to accept `undefined`, hence the type cast.
	return base + resolve_route(id, /** @type {Record<string, string>} */ (params));
}

export { base, assets, resolve as resolveRoute };
