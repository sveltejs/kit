import { json } from '@sveltejs/kit';
import { increment } from '../state.js';

export function GET() {
	console.warn('\n\nCALLED GET /load/cache-control/increment\n\n');
	increment();
	return json({});
}
