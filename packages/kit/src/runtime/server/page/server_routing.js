/** @import { SSRManifest } from '@sveltejs/kit' */
import { base, assets, relative } from '$app/paths/internal/server';
import { text } from '@sveltejs/kit';
import { s } from '../../../utils/misc.js';
import { find_route } from '../../../utils/routing.js';
import { get_relative_path } from '../../utils.js';

/**
 * @param {import('types').SSRClientRoute} route
 * @param {URL} url
 * @param {NonNullable<SSRManifest['_']['client']>} client
 * @returns {string}
 */
export function generate_route_object(route, url, client) {
	const { errors, layouts, leaf } = route;

	const nodes = [...errors, ...layouts.map((l) => l?.[1]), leaf[1]]
		.filter((n) => typeof n === 'number')
		.map((n) => `'${n}': () => ${create_client_import(client.nodes?.[n], url)}`)
		.join(',\n\t\t');

	// stringified version of
	/** @type {import('types').CSRRouteServer} */
	return [
		`{\n\tid: ${s(route.id)}`,
		`errors: ${s(route.errors)}`,
		`layouts: ${s(route.layouts)}`,
		`leaf: ${s(route.leaf)}`,
		`nodes: {\n\t\t${nodes}\n\t}\n}`
	].join(',\n\t');
}

/**
 * @param {string | undefined} import_path
 * @param {URL} url
 */
function create_client_import(import_path, url) {
	if (!import_path) return 'Promise.resolve({})';

	// During DEV, Vite will make the paths absolute (e.g. /@fs/...)
	if (import_path[0] === '/') {
		return `import('${import_path}')`;
	}

	// During PROD, they're root-relative
	if (assets !== '') {
		return `import('${assets}/${import_path}')`;
	}

	if (!relative) {
		return `import('${base}/${import_path}')`;
	}

	// Else we make them relative to the server-side route resolution request
	// to support IPFS, the internet archive, etc.
	let path = get_relative_path(url.pathname, `${base}/${import_path}`);
	if (path[0] !== '.') path = `./${path}`;
	return `import('${path}')`;
}

/**
 * @param {string} resolved_path
 * @param {URL} url
 * @param {SSRManifest} manifest
 * @returns {Promise<Response>}
 */
export async function resolve_route(resolved_path, url, manifest) {
	if (!manifest._.client?.routes) {
		return text('Server-side route resolution disabled', { status: 400 });
	}

	try {
		const matchers = await manifest._.matchers();
		const result = find_route(resolved_path, manifest._.client.routes, matchers);

		return create_server_routing_response(
			result?.route ?? null,
			result?.params ?? {},
			url,
			manifest._.client
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
 * @param {SSRManifest} manifest
 * @returns {Response}
 */
export function resolve_route_by_id(route_id, url, manifest) {
	if (!manifest._.client?.routes) {
		return text('Server-side route resolution disabled', { status: 400 });
	}

	try {
		const route = manifest._.client.routes.find((r) => r.id === route_id);

		if (route) {
			return create_server_routing_response(route, null, url, manifest._.client).response;
		}

		// `client.routes` only contains routes with a `+page`, so a miss above doesn't mean the
		// route doesn't exist — it might be a `+server.js`-only route. `_.routes` includes those
		// (with `page: null`), so we can distinguish "exists but has no code" from "unknown".
		if (manifest._.routes.some((r) => r.id === route_id && !r.page)) {
			return text('export const endpoint_only = true;', { headers: js_headers() });
		}

		return create_server_routing_response(null, null, url, manifest._.client).response;
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
 * @param {NonNullable<SSRManifest['_']['client']>} client
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
 * @param {NonNullable<SSRManifest['_']['client']>} client
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

	return `${create_client_import(client.start, url)}.then(x => x.load_css([${css}]));\n`;
}
