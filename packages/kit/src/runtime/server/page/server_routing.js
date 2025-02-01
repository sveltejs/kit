import { base, assets, app_dir } from '__sveltekit/paths';
import { text } from '../../../exports/index.js';
import { s } from '../../../utils/misc.js';
import { exec } from '../../../utils/routing.js';
import { decode_params, add_resolution_prefix } from '../../../utils/url.js';
import { get_relative_path } from '../../utils.js';

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function has_resolution_prefix(pathname) {
	return (
		pathname === `${base}/${app_dir}/route.js` || pathname.startsWith(`${base}/${app_dir}/route/`)
	);
}

/**
 * @param {string} pathname
 * @returns {string}
 */
export function strip_resolution_prefix(pathname) {
	return base + (pathname.slice(`${base}/${app_dir}/route`.length, -3) || '/');
}

/**
 * @param {URL} url
 * @returns {string}
 */
export function regular_route_to_route_resolution(url) {
	return add_resolution_prefix(url.pathname, base, app_dir);
}

/**
 * @param {import('types').SSRClientRoute | string} route
 * @param {URL} url
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {string}
 */
export function create_stringified_csr_server_route(route, url, manifest) {
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
		.map((n) => `'${n}': () => ${create_client_import(manifest._.client.nodes?.[n], url)}`)
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

	// If assets is set to an absolute URL, get it from there
	if (assets && assets[0] !== '/') {
		return `import('${assets}/${import_path}')`;
	}

	// Else we make them relative to the server-side route resolution request
	// to support IPFS, the internet archive, etc.
	let path = get_relative_path(url.pathname, `${assets || base}/${import_path}`);
	if (path[0] !== '.') path = `./${path}`;
	return `import('${path}')`;
}

/**
 * @param {string} resolved_path
 * @param {URL} url
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {Promise<Response>}
 */
export async function resolve_route(resolved_path, url, manifest) {
	if (!manifest._.client.routes) {
		return text('Server-side route resolution disabled', { status: 400 });
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

	return create_server_routing_response(route, params, url, manifest).response;
}

/**
 * @param {import('types').SSRClientRoute | string | null} route
 * @param {Partial<Record<string, string>>} params
 * @param {URL} url
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {{response: Response, body: string}}
 */
export function create_server_routing_response(route, params, url, manifest) {
	const headers = new Headers({
		'content-type': 'application/javascript; charset=utf-8'
	});

	if (route) {
		const csr_route = create_stringified_csr_server_route(route, url, manifest);
		const body = `export const route = ${csr_route}; export const params = ${JSON.stringify(params)};`;

		return { response: text(body, { headers }), body };
	} else {
		return { response: text('', { headers }), body: '' };
	}
}
