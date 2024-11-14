/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	event.cookies.set('a', 'teapot', { path: '' });
	event.cookies.set('b', 'jane austen', { path: '' });

	return {
		a: event.cookies.get('a'),
		b: event.cookies.get('b')
	};
}
