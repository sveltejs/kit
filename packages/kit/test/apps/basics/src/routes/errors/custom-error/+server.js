/**
 * This gets intercepted by the handleError hook and sets the status code to 422
 */
export function GET() {
	throw new Error('Custom error');
}
