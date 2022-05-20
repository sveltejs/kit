/** @type {import('./data.json').RequestHandler} */
export function get() {
	return {
		body: {
			answer: 42
		}
	};
}