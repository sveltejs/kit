import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ cookies }) {
	const answer = +cookies.get('answer');

	return json(
		{ answer },
		{
			headers: {
				'set-cookie': `doubled=${answer * 2}; HttpOnly; Path=/load/set-cookie-fetch`
			}
		}
	);
}
