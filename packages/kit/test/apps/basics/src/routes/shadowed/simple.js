/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ locals }) {
	return {
		body: {
			answer: locals.answer
		}
	};
}
