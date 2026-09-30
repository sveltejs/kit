/** @type {import('./$types').RequestHandler} */
export function GET() {
	throw new Error('Regular error from tracing endpoint test');
}
