import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, setHeaders, cookies }) {
	setHeaders({
		'cache-control': 'public, max-age=7'
	});

	return json({
		foo: request.headers.get('x-foo'),
		count: +(cookies.get('fetch-cache-control-headers-diff') ?? 0)
	});
}

/** @type {import('./$types').RequestHandler} */
export function POST({ cookies }) {
	cookies.set(
		'fetch-cache-control-headers-diff',
		String(+(cookies.get('fetch-cache-control-headers-diff') ?? 0) + 1),
		{ path: '/' }
	);

	return new Response();
}
