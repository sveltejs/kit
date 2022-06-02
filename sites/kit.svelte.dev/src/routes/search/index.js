import { init } from '$lib/search/init';

let indexes;
let lookup;

/** @type {import('./__types/index').RequestHandler} */
export async function get({ url }) {
	if (!indexes) {
		// TODO this feels a bit hacky, not sure if there's a better approach
		const res = await fetch(`${url.origin}/content.json`);
		const { blocks } = await res.json();
		({ indexes, lookup } = init(blocks));
	}

	const query = url.searchParams.get('q');

	const results = indexes
		.map((index) => index.search(query))
		.flat()
		.map((href) => lookup.get(href));

	return {
		body: {
			query,
			results
		}
	};
}
