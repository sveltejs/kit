/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	event.cookies.set('a', 'teapot');
	event.cookies.set('b', 'jane austen');

	const data = {
		a: event.cookies.get('a'),
		b: event.cookies.get('b')
	};

	return data;
}
