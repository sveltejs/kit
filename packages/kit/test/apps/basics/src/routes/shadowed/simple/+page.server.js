/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ locals }) {
	return {
		answer: locals.answer
	};
}
