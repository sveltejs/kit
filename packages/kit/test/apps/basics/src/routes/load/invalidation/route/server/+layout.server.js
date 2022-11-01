/** @type {import('./$types').LayoutServerLoad} */
export function load({ route }) {
	return {
		route: { ...route } // TODO serialize data before determining usage
	};
}
