import { json } from '@sveltejs/kit';
import { count } from '../state.js';

export function GET({ setHeaders }) {
	if (process.env.DEBUG) console.warn(`\n\nCALLED GET /load/cache-control/count`);
	setHeaders({ 'cache-control': 'public, max-age=30', age: '26' });
	const result = json({ count });
	if (process.env.DEBUG) console.warn('RETURNING FROM GET /load/cache-control/count\n\n');
	return result;
}

export function POST() {
	return new Response();
}
