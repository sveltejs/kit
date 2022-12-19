import { json } from '@sveltejs/kit';
import { count } from '../state.js';

export function GET({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=30', age: '10' });
	return json({ count });
}

export function POST() {
	return new Response();
}
