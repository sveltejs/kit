/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
	cookies.set('foo', 'bar', { httpOnly: false });
}
