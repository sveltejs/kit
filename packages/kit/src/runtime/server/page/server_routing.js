import { s } from '../../../utils/misc.js';
import { has_server_load } from '../../../utils/routing.js';
import { load_page_and_error_nodes } from './load_page_nodes.js';

/**
 * @param {string | null} id
 * @param {import('types').PageNodeIndexes} page
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns
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
