import { json } from '@sveltejs/kit';

/** @type {import("./$types").RequestHandler} */
export function GET({ cookies }) {
	cookies.set(
		'cache-control-force-count',
		+(cookies.get('cache-control-force-count') ?? 0) + 1 + '',
		{ path: '/' }
	);

	return json({});
}
