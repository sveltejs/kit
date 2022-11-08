/** @type {import('./$types').PageLoad} */
export async function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=30'
	});
}
