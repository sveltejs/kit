/** @type {import('./$types').RequestHandler} */
export const GET = () => {
	return new Response(new Uint8Array([1, 2, 3, 4]), {
		headers: {
			'cache-control': 'public, max-age=7'
		}
	});
};
