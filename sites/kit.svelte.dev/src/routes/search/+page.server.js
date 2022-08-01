import { init, inited, search } from '$lib/search/search';

/** @type {import('./$types').GET} */
export async function GET({ url }) {
	if (!inited) {
		// TODO this feels a bit hacky, not sure if there's a better approach
		const res = await fetch(`${url.origin}/content.json`);
		const { blocks } = await res.json();
		init(blocks);
	}

	const query = url.searchParams.get('q');

	const results = search(query);

	return {
		query,
		results
	};
}
