/** @type {import('./$types').PageLoad} */
export function load({ route }) {
	return { routeId: route.id };
}
