import { base, assets, relative } from './internal/server.js';
import { resolve_route, find_route } from '../../../utils/routing.js';
import { decode_pathname } from '../../../utils/url.js';
import { add_data_suffix } from '../../pathname.js';
import { try_get_request_store } from '@sveltejs/kit/internal/server';
import { manifest } from '../../server/internal.js';
import { get_hooks } from '__SERVER__/internal.js';
import { DEV } from 'esm-env';

/** @type {import('./client.js').asset} */
export function asset(file) {
	// TODO 4.0 remove this
	if (file[0] === '/') {
		if (DEV) {
			console.warn(`\`asset('${file}')\` should now be \`asset('${file.slice(1)}')\``);
		}

		file = file.slice(1);
	}

	return assets !== base ? `${assets}/${file}` : resolve(file);
}

/** @type {import('./client.js').resolve} */
export function resolve(id, params) {
	let resolved;

	if (id[0] === '/') {
		// route ID
		if (id.includes('[') && !params) {
			throw new Error(`Missing params for dynamic route ID ${id}`);
		}

		resolved = resolve_route(id, params ?? {});
	} else {
		resolved = '/' + id;
	}

	if (relative) {
		const store = try_get_request_store();

		if (store && !store.state.prerendering?.fallback) {
			// the relative path depth must reflect the URL the browser is actually at, which
			// for a data request includes the `__data.json` suffix that was stripped during routing
			const pathname = store.event.isDataRequest
				? add_data_suffix(store.event.url.pathname)
				: store.event.url.pathname;
			const after_base = pathname.slice(base.length);
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
		const origin = store?.event.url.origin ?? 'a://a';
		url = new URL(url, origin);
	}

	const { reroute } = await get_hooks();

	let resolved_path;

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
