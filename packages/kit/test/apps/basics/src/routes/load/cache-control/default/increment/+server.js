import { json } from '@sveltejs/kit';

/** @type {import("./$types").RequestHandler} */
export function GET({ cookies }) {
	cookies.set(
		'cache-control-default-count',
		+(cookies.get('cache-control-default-count') ?? 0) + 1 + '',
		{ path: '/' }
	);

	return json({});
}
