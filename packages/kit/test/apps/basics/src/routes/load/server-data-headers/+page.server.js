/** @type {import('@sveltejs/kit').Load} */
export async function load({ setHeaders }) {
	setHeaders({
		'x-server-data': 'true',
		'cache-control': 'max-age=0, s-maxage=60' // should be ignored
	});
}
