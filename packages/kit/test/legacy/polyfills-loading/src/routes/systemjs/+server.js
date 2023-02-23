/** @type {import('./$types').RequestHandler} */
export function GET() {
	const js = import.meta.glob('../../../node_modules/systemjs/dist/system.js', {
		as: 'raw',
		eager: true
	})['../../../node_modules/systemjs/dist/system.js'];

	return new Response(js, {
		status: 200,
		headers: {
			'Content-type': 'application/javascript'
		}
	});
}
