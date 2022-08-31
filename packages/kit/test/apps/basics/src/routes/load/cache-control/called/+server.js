import { json } from '@sveltejs/kit';

let count = 0;

export function GET({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=4', age: '2' });
	return json({ count });
}

export function POST() {
	count++;
}
