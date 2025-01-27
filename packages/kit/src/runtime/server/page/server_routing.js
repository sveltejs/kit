import { s } from '../../../utils/misc.js';
import { has_server_load } from '../../../utils/routing.js';
import { load_page_and_error_nodes } from './load_page_nodes.js';
import { text } from '../../../exports/index.js';

/**
 * @param {URL} url
 * @param {import('types').SSROptions} options
 * @returns {boolean}
 */
export function is_route_resolution_request(url, options) {
	return (
		url.pathname === `/${options.app_dir}/routes.js` ||
		url.pathname.startsWith(`/${options.app_dir}/routes/`)
	);
}

/**
 * @param {URL} url
 * @param {import('types').SSROptions} options
 * @returns {string}
 */
export function route_resolution_to_regular_route(url, options) {
	return url.pathname.slice(`/${options.app_dir}/routes`.length, -3) || '/';
}

/**
 * @param {URL} url
 * @param {import('types').SSROptions} options
 * @returns {string}
 */
export function regular_route_to_route_resolution(url, options) {
	return `/${options.app_dir}/routes` + (url.pathname === '/' ? '.js' : url.pathname + '.js');
}

/**
 * @param {string | null} id
 * @param {import('types').PageNodeIndexes} page
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {Promise<string>}
 */
export async function create_stringified_csr_server_route(id, page, manifest) {
	const { errors, layouts, leaf } = await load_page_and_error_nodes(page, manifest);

	const nodes = `{ ${[...errors, ...layouts, leaf]
		.filter((n) => !!n)
		.map((n) => `'${n.index}': () => import('/${n.imports[0]}')`)
		.join(', ')} }`;

	// stringified version of
	/** @type {import('types').CSRRouteServer} */
	return [
		`{\n\tid: ${s(id)}`,
		`errors: [${errors.map((n) => (n ? n.index : 'undefined')).join(', ')}]`,
		`layouts: [${layouts.map((n) => (n ? `[${has_server_load(n)}, ${n.index}]` : 'undefined')).join(', ')}]`,
		`leaf: [${has_server_load(leaf)}, ${leaf.index}]`,
		`nodes: ${nodes}\n}`
	].join(',\n\t');
}

/**
 * @param {string | null} id
 * @param {import('types').PageNodeIndexes | null | undefined} page
 * @param {Partial<Record<string, string>>} params
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {Promise<{response: Response, body: string}>}
 */
export async function create_server_routing_response(id, page, params, manifest) {
	const headers = new Headers({
		'content-type': 'application/javascript; charset=utf-8'
	});

	if (page) {
		const csr_route = await create_stringified_csr_server_route(id, page, manifest);
		const body = `export const route = ${csr_route}; export const params = ${JSON.stringify(params)};`;

		return { response: text(body, { headers }), body };
	} else {
		return { response: text('', { headers }), body: '' };
	}
}
