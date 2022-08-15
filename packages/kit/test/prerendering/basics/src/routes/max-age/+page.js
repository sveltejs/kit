/** @type {import('@sveltejs/kit').Load} */
export function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=300'
	});
}
