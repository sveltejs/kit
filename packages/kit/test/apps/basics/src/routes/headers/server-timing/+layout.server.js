/** @type {import('./$types').LayoutServerLoad} */
export function load({ setHeaders }) {
	setHeaders({
		'server-timing': 'db;dur=53'
	});
}
