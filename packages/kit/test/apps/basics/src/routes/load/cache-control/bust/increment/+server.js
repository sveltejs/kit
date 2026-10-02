import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ cookies }) {
	cookies.set(
		'cache-control-bust-count',
		+(cookies.get('cache-control-bust-count') ?? 0) + 1 + '',
		{ path: '/' }
	);

	return json({});
}
