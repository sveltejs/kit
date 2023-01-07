import { json } from '@sveltejs/kit';
import { count } from '../state.js';

export function GET({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=4', age: '2' });
	return json({ count });
}

export function POST() {
	return new Response();
}
