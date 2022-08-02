/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const answer = url.searchParams.get('answer') || '42';
	return new Response(JSON.stringify({}), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'set-cookie': `answer=${answer}; HttpOnly; Path=/load/set-cookie-fetch`
		}
	});
}
