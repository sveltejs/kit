import { json } from '@sveltejs/kit';
import { increment } from '../state.js';

export function GET() {
	increment();
	return json({});
}
