import { json } from '@sveltejs/kit';

let x = 0;
export async function GET({ url, setHeaders, request }) {
	console.log('ENDPOINT', x++);

	const search = url.searchParams.get('search') || '';

	setHeaders({
		'cache-control': 'max-age=60',
		Vary: 'todos-cache'
	});
	return json({ a: Math.random() });
}
