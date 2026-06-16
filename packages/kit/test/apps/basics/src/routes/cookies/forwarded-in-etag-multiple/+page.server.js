/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
	cookies.set('one', '1', { path: '', httpOnly: false });
	cookies.set('two', '2', { path: '', httpOnly: false });
	cookies.set('three', '3', { path: '', httpOnly: false });
}
