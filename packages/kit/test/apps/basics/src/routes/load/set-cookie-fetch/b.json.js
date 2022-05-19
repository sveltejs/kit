/** @type {import('./__types/b.json').RequestHandler} */
export function get({ request }) {
	const cookie = request.headers.get('cookie');

	const match = /answer=([^;]+)/.exec(cookie);
	const answer = +match?.[1];

	return {
		body: {
			answer
		},
		headers: {
			'set-cookie': `doubled=${answer * 2}; HttpOnly; Path=/load/set-cookie-fetch`
		}
	};
}
