import { content } from '$lib/search/content.server.js';
import { init, inited, search } from '$lib/search/search.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	if (!inited) {
		init(content());
	}

	const query = url.searchParams.get('q');

	const results = query ? search(query) : [];

	return {
		query,
		results
	};
}
