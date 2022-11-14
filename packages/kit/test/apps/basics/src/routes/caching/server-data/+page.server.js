/** @type {import('./$types').PageServerLoad} */
export async function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=30'
	});
}
