/** @type {import('./$types').LayoutServerLoad} */
export function load({ setHeaders }) {
	// browsers block any script loaded without integrity metadata
	setHeaders({ 'integrity-policy': 'blocked-destinations=(script)' });
}
