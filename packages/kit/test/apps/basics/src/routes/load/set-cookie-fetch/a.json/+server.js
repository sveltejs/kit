import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const answer = url.searchParams.get('answer') || '42';

	return json(
		{},
		{
			headers: {
				'set-cookie': `answer=${answer}; HttpOnly; Path=/load/set-cookie-fetch`
			}
		}
	);
}
