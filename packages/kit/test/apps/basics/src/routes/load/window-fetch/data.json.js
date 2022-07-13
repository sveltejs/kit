/** @type {import('./__types/data.json').RequestHandler} */
export function get() {
	return {
		body: {
			answer: 42
		}
	};
}
