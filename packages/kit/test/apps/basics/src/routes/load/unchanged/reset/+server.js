import { reset } from '../state.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	reset();
	return new Response(undefined, {
		status: 307,
		headers: {
			location: `${url.origin}/load/unchanged/isolated/a`
		}
	});
}
