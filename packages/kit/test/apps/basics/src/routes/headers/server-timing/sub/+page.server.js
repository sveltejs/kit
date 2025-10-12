/** @type {import('./$types').PageServerLoad} */
export function load({ setHeaders }) {
	setHeaders({
		'server-timing': 'external-api;dur=250'
	});
}
