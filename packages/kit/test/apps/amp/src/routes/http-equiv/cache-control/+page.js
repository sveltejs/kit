export const prerender = true;

/** @type {import('./$types').PageLoad} */
export function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=300'
	});
}
