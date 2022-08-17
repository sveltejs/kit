export function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=60'
	});
}
