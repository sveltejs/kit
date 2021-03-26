/** @type {import('../../../../../../types').RequestHandler} */
export function get({ headers }) {
	return {
		body: { headers }
	};
}
