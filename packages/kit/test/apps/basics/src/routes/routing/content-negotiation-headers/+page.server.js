/** @type {import('./$types').PageServerLoad} */
export function load({ setHeaders }) {
	setHeaders({ vary: 'Accept-Language' });
}
