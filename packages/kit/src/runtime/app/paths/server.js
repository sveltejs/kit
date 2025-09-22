import { base, assets, relative } from './internal/server.js';
import { resolve_route } from '../../../utils/routing.js';
import { get_request_store } from '@sveltejs/kit/internal/server';

/** @type {import('./client.js').asset} */
export function asset(file) {
	// @ts-expect-error we use the `resolve` mechanism, but with the 'wrong' input
	return assets ? assets + file : resolve(file);
}

/** @type {import('./client.js').resolve} */
export function resolve(id, params) {
	const resolved = resolve_route(id, /** @type {Record<string, string>} */ (params));

	if (relative) {
		const { event, state } = get_request_store();

		if (state.prerendering?.fallback) {
			return resolved;
		}

		const segments = event.url.pathname.slice(base.length).split('/').slice(2);
		const prefix = segments.map(() => '..').join('/') || '.';

		return prefix + resolved;
	}

	return resolved;
}

export { base, assets, resolve as resolveRoute };
