/** @type {import('./$types').LayoutLoad} */
export function load({ route }) {
	return { route, random: Math.random() };
}
