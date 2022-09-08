/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	const data = {
		a: event.cookies.get('a')
	};

	return data;
}
