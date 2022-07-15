/** @type {import('./__types/[x]').RequestHandler} */
export function GET({ locals }) {
	return {
		body: {
			key: locals.key,
			params: locals.params
		}
	};
}
