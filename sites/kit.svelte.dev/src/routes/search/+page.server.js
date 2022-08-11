import { content } from '$lib/search/content.server.js';
import { init, inited, search } from '$lib/search/search.js';

/** @type {import('./$types').GET} */
export async function GET({ url }) {
	if (!inited) {
		init(content());
	}

	const query = url.searchParams.get('q');

	const results = search(query);

	return {
		query,
		results
	};
}
