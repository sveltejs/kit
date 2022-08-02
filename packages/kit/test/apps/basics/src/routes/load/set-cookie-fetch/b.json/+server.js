/** @type {import('./$types').RequestHandler} */
export function GET({ request }) {
	const cookie = request.headers.get('cookie');

	const match = /answer=([^;]+)/.exec(cookie);
	const answer = +match?.[1];

	return new Response(
		JSON.stringify({
			answer
		}),
		{
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'set-cookie': `doubled=${answer * 2}; HttpOnly; Path=/load/set-cookie-fetch`
			}
		}
	);
}
