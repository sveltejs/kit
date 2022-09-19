/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	return {
		a: event.cookies.get('a')
	};
}
