/** @type {import('./[x]').RequestHandler} */
export function get({ locals }) {
	return {
		body: {
			key: locals.key,
			params: locals.params
		}
	};
}
