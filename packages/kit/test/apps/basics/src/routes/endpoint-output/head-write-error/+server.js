import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ setHeaders }) {
	setHeaders({
		'x-test': '\u001f'
	});

	return json({});
}
