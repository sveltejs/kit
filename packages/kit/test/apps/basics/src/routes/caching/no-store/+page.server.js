/** @type {import('./$types').PageServerLoad} */
export async function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'private, no-store'
	});
}
