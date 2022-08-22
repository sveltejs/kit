import { reset } from '../state.js';

/** @type {import('./$types').RequestHandler} */
export function GET() {
	reset();
	return new Response('ok');
}
