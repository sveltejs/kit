import { json } from '@sveltejs/kit';

export function GET({ cookies }) {
	cookies.set(
		'cache-control-default-count',
		+(cookies.get('cache-control-default-count') ?? 0) + 1 + ''
	);

	return json({});
}
