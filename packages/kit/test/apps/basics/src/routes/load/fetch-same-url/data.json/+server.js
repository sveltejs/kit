import { json } from '@sveltejs/kit';

let result = 0;

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	if (url.searchParams.has('reset')) {
		result = 0;
		return json({ result });
	}

	result++;
	return json({ result });
}
