/** @type {import('./$types').PageServerLoad} */
export function load({ setHeaders }) {
	setHeaders({ 'x-failed-render': '1' });
}
