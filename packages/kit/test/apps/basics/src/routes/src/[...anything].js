/** @type {import('./__types/[...anything]').RequestHandler} */
export function GET() {
	return {
		body: 'dynamically rendered file'
	};
}
