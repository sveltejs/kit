import { json } from '@sveltejs/kit';
import { increment } from '../state.js';

export function GET() {
	if (process.env.DEBUG) console.warn('\n\nCALLED GET /load/cache-control/increment');
	increment();
	const result = json({});
	if (process.env.DEBUG) console.warn('RETURNING FROM GET /load/cache-control/increment\n\n');
	return result;
}
