/** @type {import('./__types/data.json').RequestHandler} */
export function GET() {
	return {
		body: {
			answer: 42
		}
	};
}
