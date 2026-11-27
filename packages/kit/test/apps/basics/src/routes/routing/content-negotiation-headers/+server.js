import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ url, setHeaders }) {
	setHeaders({ vary: 'Accept-Language' });

	if (url.searchParams.has('error')) {
		throw new Error('endpoint error');
	}

	return json({ source: 'endpoint' });
}
