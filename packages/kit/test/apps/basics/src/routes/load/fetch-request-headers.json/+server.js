import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ request }) {
	/** @type {Record<string, string>} */
	const body = {};

	request.headers.forEach((value, key) => {
		body[key] = value;
	});

	return json(body);
}
