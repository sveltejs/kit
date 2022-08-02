/** @type {import('./$types').RequestHandler} */
export function GET({ locals }) {
	return new Response(
		JSON.stringify({
			key: locals.key,
			params: locals.params
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
