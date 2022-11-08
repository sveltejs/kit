import { json } from '@sveltejs/kit';
import { reset } from '../state.js';

export function GET() {
	reset();
	return json({});
}
