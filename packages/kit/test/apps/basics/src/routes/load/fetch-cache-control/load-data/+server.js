import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=7'
	});

	try {
		const { lang } = await request.json();
		if (lang === 'fr') {
			return json({ hi: 'bonjour' });
		} else if (lang === 'hu') {
			return json({ hi: 'szia' });
		}
	} catch (error) {}

	// default to english
	return json({ hi: 'hello' });
}
