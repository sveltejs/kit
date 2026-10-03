import { error, json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const ids = url.searchParams.get('ids')?.split(',') ?? [];

	if (new Set(ids).size !== ids.length) {
		error(400, `batch calls must be deduplicated, but got ${ids.join(',')}`);
	}

	return json(Object.fromEntries(ids.map((id) => [id, `item ${id}`])));
}
