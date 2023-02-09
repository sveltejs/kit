import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=7'
	});

	return json({
		foo: request.headers.get('x-foo')
	});
}
