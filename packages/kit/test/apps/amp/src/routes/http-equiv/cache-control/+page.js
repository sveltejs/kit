export const prerender = true;

/** @type {import('./$types').Load} */
export function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=300'
	});
}
