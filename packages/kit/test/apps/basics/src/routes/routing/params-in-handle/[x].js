/** @type {import('./__types/[x]').RequestHandler} */
export function get({ locals }) {
	return {
		body: {
			key: locals.key,
			params: locals.params
		}
	};
}
