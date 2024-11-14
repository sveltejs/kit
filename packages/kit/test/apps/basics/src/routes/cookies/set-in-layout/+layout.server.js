/** @type {import('./$types').LayoutServerLoad} */
export function load(event) {
	event.cookies.set('a', 'i was set in the layout load', { path: '' });
}
