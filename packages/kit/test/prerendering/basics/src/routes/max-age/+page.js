/** @type {import('@sveltejs/kit').Load} */
export function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=300'
	});
}
