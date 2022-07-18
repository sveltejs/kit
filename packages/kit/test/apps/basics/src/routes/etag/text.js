/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return {
		body: 'some text',
		headers: {
			expires: 'yesterday'
		}
	};
}
