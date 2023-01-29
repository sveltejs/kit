import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=7'
	});

	const authHeader = request.headers.get('Authorization');
	const token = authHeader ? authHeader.split(' ')[1] : null;

	if (token === '31415') return json({ amount: 100 });

	return json({ message: 'No Authorized' });
}
