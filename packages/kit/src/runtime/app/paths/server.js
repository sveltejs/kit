import { base, assets, relative, initial_base } from './internal/server.js';
import { resolve_route, find_route } from '../../../utils/routing.js';
import { decode_pathname } from '../../../utils/url.js';
import { try_get_request_store } from '@sveltejs/kit/internal/server';
import { manifest } from '__sveltekit/server';
import { get_hooks } from '__SERVER__/internal.js';

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
export async function match(url) {
	const store = try_get_request_store();

	if (typeof url === 'string') {
		const origin = store?.event.url.origin ?? 'http://internal';
		url = new URL(url, origin);
	}

	const { reroute } = await get_hooks();

	let resolved_path = url.pathname;

	try {
		resolved_path = decode_pathname(
			(await reroute?.({ url: new URL(url), fetch: store?.event.fetch ?? fetch })) ?? url.pathname
		);
	} catch {
		return null;
	}

	if (base && resolved_path.startsWith(base)) {
		resolved_path = resolved_path.slice(base.length) || '/';
	}

	const matchers = await manifest._.matchers();
	const result = find_route(resolved_path, manifest._.routes, matchers);

	if (result) {
		return {
			id: /** @type {import('$app/types').RouteId} */ (result.route.id),
			params: result.params
		};
	}

	return null;
}

export { base, assets, resolve as resolveRoute };
