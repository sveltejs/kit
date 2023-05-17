import { json } from '@sveltejs/kit';

let count = 0;

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	if (url.searchParams.has('reset')) count = 0;
	return json({ count: count++ });
}
