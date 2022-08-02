/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ request }) {
	/** @type {Record<string, string>} */
	const headers = {};
	request.headers.forEach((value, key) => {
		if (key !== 'cookie') {
			headers[key] = value;
		}
	});

	return new Response(JSON.stringify(headers), {
		headers: { 'content-type': 'application/json; charset=utf-8' }
	});
}
