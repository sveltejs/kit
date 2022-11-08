/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	return {
		encoding: event.cookies.get('encoding')
	};
}
