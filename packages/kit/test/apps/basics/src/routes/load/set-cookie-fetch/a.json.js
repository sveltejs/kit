/** @type {import('./__types/a.json').RequestHandler} */
export function GET({ url }) {
	const answer = url.searchParams.get('answer') || '42';

	return {
		headers: {
			'set-cookie': `answer=${answer}; HttpOnly; Path=/load/set-cookie-fetch`
		},
		body: {}
	};
}
