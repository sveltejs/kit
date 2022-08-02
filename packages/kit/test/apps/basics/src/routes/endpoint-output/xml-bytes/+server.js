/** @type {import('@sveltejs/kit').RequestHandler} */
export const GET = () => {
	const body = '<foo />';
	return new Response(new TextEncoder().encode(body), {
		headers: { 'content-type': 'application/xml' },
		status: 200
	});
};
