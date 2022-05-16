/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ locals }) {
	return {
		body: {
			answer: {
				toJSON: () => locals.answer
			}
		}
	};
}
