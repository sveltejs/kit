/** @import { SSRManifest } from 'types' */
import { base, assets } from '#app/paths';
import { relative } from '$app/paths/internal/server';
import { text } from '@sveltejs/kit';
import { s } from '../../../utils/misc.js';
import { find_route } from '../../../utils/routing.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import { manifest } from '../internal.js';

/**
 * @param {import('types').SSRClientRoute} route
 * @param {URL} url
 * @param {NonNullable<SSRManifest['client']>} client
 * @returns {string}
 */
export function generate_route_object(route, url, client) {
	const { errors, layouts, leaf } = route;
	const paths = resolve_paths(url.pathname);

	const nodes = [...errors, ...layouts.map((l) => l?.[1]), leaf[1]]
		.filter((n) => typeof n === 'number')
		.map((n) => `'${n}': () => ${create_client_import(client.nodes?.[n], paths)}`)
		.join(',\n\t\t');

	// stringified version of
	/* @type {import('types').CSRRouteServer} */
	return [
		`{\n\tid: ${s(route.id)}`,
		`errors: ${s(route.errors)}`,
		`layouts: ${s(route.layouts)}`,
		`leaf: ${s(route.leaf)}`,
		`nodes: {\n\t\t${nodes}\n\t}\n}`
	].join(',\n\t');
}

/**
 * The `base` and `assets` prefixes for client paths in a document at `pathname`. With
 * `paths.relative`, they're relative to that document so the app also works when served
 * from IPFS, the internet archive, or behind a proxy.
 * @param {string} pathname
 */
export function resolve_paths(pathname) {
	if (!relative) return { base, assets };

	const segments = pathname.slice(base.length).split('/').slice(2);
	const relative_base = segments.map(() => '..').join('/') || '.';

	return {
		base: relative_base,
		// same-origin assets are relative too, except for the placeholder used by `vite preview`
		assets: !assets || (assets[0] === '/' && assets !== SVELTE_KIT_ASSETS) ? relative_base : assets
	};
}

/**
 * @param {string} path a root-absolute dev path (e.g. `/@fs/...`) or a prod path relative to `assets`
 * @param {ReturnType<typeof resolve_paths>} paths
 */
export function client_path(path, { base, assets }) {
	return path[0] === '/' ? base + path : `${assets}/${path}`;
}

/**
 * @param {string | undefined} import_path
 * @param {ReturnType<typeof resolve_paths>} paths
 */
function create_client_import(import_path, paths) {
	return import_path ? `import('${client_path(import_path, paths)}')` : 'Promise.resolve({})';
}

/**
 * @param {string} resolved_path
 * @param {URL} url
 * @returns {Promise<Response>}
 */
export async function resolve_route(resolved_path, url) {
	if (!manifest.client?.routes) {
		return text('Server-side route resolution disabled', { status: 400 });
	}

	try {
		const matchers = await manifest.matchers();
		const result = find_route(resolved_path, manifest.client.routes, matchers);

		return create_server_routing_response(
			result?.route ?? null,
			result?.params ?? {},
			url,
			manifest.client
		).response;
	} catch {
		return text('Error resolving route', { status: 500 });
	}
}

/**
 * Resolve a route-ID resolution request (`/_app/routes/<id>/__route.js`) to a
 * JS module containing the route's node loaders. Params are always `{}` since
 * this endpoint exists to support `preloadCode(routeId)`, which doesn't need them.
 *
 * The module has one of three shapes, which the client uses to tell three cases apart:
 *
 * - `export const route = {...}` — a page route, with loaders to import
 * - `export const endpoint_only = true` — a real route with no `+page`, so there is
 *   nothing to preload, but the client can cache that fact and stop asking
 * - an empty module — no such route
 *
 * @param {string} route_id
 * @param {URL} url
 * @returns {Response}
 */
export function resolve_route_by_id(route_id, url) {
	if (!manifest.client?.routes) {
		return text('Server-side route resolution disabled', { status: 400 });
	}

	try {
		const route = manifest.client.routes.find((r) => r.id === route_id);

		if (route) {
			return create_server_routing_response(route, null, url, manifest.client).response;
		}

		// `client.routes` only contains routes with a `+page`, so a miss above doesn't mean the
		// route doesn't exist — it might be a `+server.js`-only route. `_.routes` includes those
		// (with `page: null`), so we can distinguish "exists but has no code" from "unknown".
		if (manifest.routes.some((r) => r.id === route_id && !r.page)) {
			return text('export const endpoint_only = true;', { headers: js_headers() });
		}

		return create_server_routing_response(null, null, url, manifest.client).response;
	} catch {
		return text('Error resolving route', { status: 500 });
	}
}

function js_headers() {
	return new Headers({
		'content-type': 'application/javascript; charset=utf-8'
	});
}

/**
 * @param {import('types').SSRClientRoute | null} route
 * @param {Partial<Record<string, string>> | null} params
 * @param {URL} url
 * @param {NonNullable<SSRManifest['client']>} client
 * @returns {{response: Response, body: string}}
 */
export function create_server_routing_response(route, params, url, client) {
	const headers = js_headers();
	let body = '';

	if (route) {
		const csr_route = generate_route_object(route, url, client);
		body = `${create_css_import(route, url, client)}export const route = ${csr_route};`;

		if (params !== null) {
			body += `\nexport const params = ${JSON.stringify(params)}`;
		}
	}

	return { response: text(body, { headers }), body };
}

/**
 * This function generates the client-side import for the CSS files that are
 * associated with the current route. Vite takes care of that when using
 * client-side route resolution, but for server-side resolution it does
 * not know about the CSS files automatically.
 *
 * @param {import('types').SSRClientRoute} route
 * @param {URL} url
 * @param {NonNullable<SSRManifest['client']>} client
 * @returns {string}
 */
function create_css_import(route, url, client) {
	const { errors, layouts, leaf } = route;

	let css = '';

	for (const node of [...errors, ...layouts.map((l) => l?.[1]), leaf[1]]) {
		if (typeof node !== 'number') continue;
		const node_css = client.css?.[node];
		for (const css_path of node_css ?? []) {
			css += `'${assets || base}/${css_path}',`;
		}
	}

	if (!css) return '';

	return `${create_client_import(client.start, resolve_paths(url.pathname))}.then(x => x.load_css([${css}]));\n`;
}
