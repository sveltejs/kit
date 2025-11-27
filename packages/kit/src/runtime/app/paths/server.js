import { base, assets, relative, initial_base } from './internal/server.js';
import { resolve_route, exec } from '../../../utils/routing.js';
import { decode_params } from '../../../utils/url.js';
import { try_get_request_store } from '@sveltejs/kit/internal/server';
import { manifest } from '__sveltekit/server';

/** @type {import('./client.js').asset} */
export function asset(file) {
	// @ts-expect-error we use the `resolve` mechanism, but with the 'wrong' input
	return assets ? assets + file : resolve(file);
}

/** @type {import('./client.js').resolve} */
export function resolve(id, params) {
	const resolved = resolve_route(id, /** @type {Record<string, string>} */ (params));

	if (relative) {
		const store = try_get_request_store();

		if (store && !store.state.prerendering?.fallback) {
			const after_base = store.event.url.pathname.slice(initial_base.length);
			const segments = after_base.split('/').slice(2);
			const prefix = segments.map(() => '..').join('/') || '.';

			return prefix + resolved;
		}
	}

	return base + resolved;
}

/** @type {import('./client.js').match} */
export async function match(pathname) {
	let path = pathname;

	if (base && path.startsWith(base)) {
		path = path.slice(base.length) || '/';
	}

	const matchers = await manifest._.matchers();

	for (const route of manifest._.routes) {
		const match = route.pattern.exec(path);
		if (!match) continue;

		const matched = exec(match, route.params, matchers);
		if (matched) {
			return {
				id: /** @type {import('$app/types').RouteId} */ (route.id),
				params: decode_params(matched)
			};
		}
	}

	return null;
}

export { base, assets, resolve as resolveRoute };
