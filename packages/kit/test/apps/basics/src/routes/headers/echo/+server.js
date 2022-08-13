import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ request }) {
	/** @type {Record<string, string>} */
	const headers = {};
	request.headers.forEach((value, key) => {
		if (key !== 'cookie') {
			headers[key] = value;
		}
	});

	return json(headers);
}
