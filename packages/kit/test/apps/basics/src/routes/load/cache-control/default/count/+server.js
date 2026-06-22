import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ setHeaders, cookies }) {
	setHeaders({ 'cache-control': 'public, max-age=4', age: '2' });

	const count = +(cookies.get('cache-control-default-count') ?? 0);

	return json({ count });
}

/** @type {import('./$types').RequestHandler} */
export function POST() {
	return new Response();
}
