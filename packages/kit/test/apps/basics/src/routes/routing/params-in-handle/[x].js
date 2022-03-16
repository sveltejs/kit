/** @type {import('./[x]').RequestHandler} */
export function get({ locals }) {
	return {
		body: {
			params: locals.params
		}
	};
}
