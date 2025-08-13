import { base, assets } from '__sveltekit/paths';
import { resolve_route } from '../../../utils/routing.js';

/** @type {import('./types.d.ts').asset} */
export function asset(file) {
	return (assets || base) + file;
}

/** @type {import('./types.d.ts').resolve} */
export function resolve(id, params) {
	return base + resolve_route(id, params);
}

export { base, assets, resolve as resolveRoute };
