import { json } from '@sveltejs/kit';
import { increment } from '../state.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	if (process.env.DEBUG) console.warn(`\n\nCALLED GET /load/cache-control/increment from ${url.searchParams.get('test')}`);
	const value = increment();
	if (process.env.DEBUG) console.warn(`incremented to ${value}`);
	const result = json({});
	if (process.env.DEBUG) console.warn('RETURNING FROM GET /load/cache-control/increment\n\n');
	return result;
}
