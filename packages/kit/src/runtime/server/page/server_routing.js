import { base } from '__sveltekit/paths';
import { text } from '../../../exports/index.js';
import { s } from '../../../utils/misc.js';
import { exec } from '../../../utils/routing.js';
import { decode_params } from '../../../utils/url.js';

/**
 * @param {URL} url
 * @param {import('types').SSROptions} options
 * @returns {boolean}
 */
export function is_route_resolution_request(url, options) {
	return (
		url.pathname === `${base}/${options.app_dir}/routes.js` ||
		url.pathname.startsWith(`${base}/${options.app_dir}/routes/`)
	);
}

/**
 * @param {URL} url
 * @param {import('types').SSROptions} options
 * @returns {string}
 */
export function route_resolution_to_regular_route(url, options) {
	return url.pathname.slice(`${base}/${options.app_dir}/routes`.length, -3) || '/';
}

/**
 * @param {URL} url
 * @param {import('types').SSROptions} options
 * @returns {string}
 */
export function regular_route_to_route_resolution(url, options) {
	return (
		`${base}/${options.app_dir}/routes` + (url.pathname === '/' ? '.js' : url.pathname + '.js')
	);
}

/**
 * @param {import('types').SSRClientRoute | string} route
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {string}
 */
export function create_stringified_csr_server_route(route, manifest) {
	if (typeof route === 'string') {
		route = /** @type {import('types').SSRClientRoute} */ (
			/** @type {import('types').SSRClientRoute[]} */ (manifest._.client.routes).find(
				(r) => r.id === route
			)
		);
	}

	const { errors, layouts, leaf } = route;

	const nodes = `{ ${[...errors, ...layouts.map((l) => l?.[1]), leaf[1]]
		.filter((n) => typeof n === 'number')
		.map(
			(n) =>
				`'${n}': () => ${manifest._.client.nodes?.[n] ? `import('/${manifest._.client.nodes[n]}')` : 'Promise.resolve({})'}`
		)
		.join(', ')} }`;

	// stringified version of
	/** @type {import('types').CSRRouteServer} */
	return [
		`{\n\tid: ${s(route.id)}`,
		`errors: ${s(route.errors)}`,
		`layouts: ${s(route.layouts)}`,
		`leaf: ${s(route.leaf)}`,
		`nodes: ${nodes}\n}`
	].join(',\n\t');
}

/**
 * @param {string} resolved_path
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {Promise<Response>}
 */
export async function resolve_route(resolved_path, manifest) {
	if (!manifest._.client.routes) {
		return text('Server routing disabled', { status: 400 });
	}

	/** @type {import('types').SSRClientRoute | null} */
	let route = null;
	/** @type {Record<string, string>} */
	let params = {};

	const matchers = await manifest._.matchers();

	for (const candidate of manifest._.client.routes) {
		const match = candidate.pattern.exec(resolved_path);
		if (!match) continue;

		const matched = exec(match, candidate.params, matchers);
		if (matched) {
			route = candidate;
			params = decode_params(matched);
			break;
		}
	}

	return create_server_routing_response(route, params, manifest).response;
}

/**
 * @param {import('types').SSRClientRoute | string | null} route
 * @param {Partial<Record<string, string>>} params
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {{response: Response, body: string}}
 */
export function create_server_routing_response(route, params, manifest) {
	const headers = new Headers({
		'content-type': 'application/javascript; charset=utf-8'
	});

	if (route) {
		const csr_route = create_stringified_csr_server_route(route, manifest);
		const body = `export const route = ${csr_route}; export const params = ${JSON.stringify(params)};`;

		return { response: text(body, { headers }), body };
	} else {
		return { response: text('', { headers }), body: '' };
	}
}
