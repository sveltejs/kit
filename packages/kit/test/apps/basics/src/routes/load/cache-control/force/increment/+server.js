import { json } from '@sveltejs/kit';

export function GET({ cookies }) {
	cookies.set(
		'cache-control-force-count',
		+(cookies.get('cache-control-force-count') ?? 0) + 1 + ''
	);

	return json({});
}
