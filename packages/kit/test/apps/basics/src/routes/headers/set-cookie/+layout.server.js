/** @type {import('./$types').LayoutServerLoad} */
export function load({ cookies }) {
	cookies.set('cookie1', 'value1', {
		secure: false // safari
	});
}
