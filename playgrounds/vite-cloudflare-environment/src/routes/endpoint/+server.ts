import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export function GET({ url }: RequestEvent) {
	const min = Number(url.searchParams.get('min') ?? '0');
	const max = Number(url.searchParams.get('max') ?? '1');
	const d = max - min;
	if (isNaN(d) || d < 0) {
		error(400, 'min and max must be numbers, and min must be less than max');
	}
	const random = min + Math.random() * d;

	return new Response(String(random));
}
