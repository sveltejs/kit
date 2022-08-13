import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ request }) {
	const cookie = request.headers.get('cookie');

	const match = /answer=([^;]+)/.exec(cookie);
	const answer = +match?.[1];

	return json(
		{ answer },
		{
			headers: {
				'set-cookie': `doubled=${answer * 2}; HttpOnly; Path=/load/set-cookie-fetch`
			}
		}
	);
}
