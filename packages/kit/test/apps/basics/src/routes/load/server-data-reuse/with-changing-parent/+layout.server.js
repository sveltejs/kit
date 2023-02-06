/** @type {import('./$types').LayoutServerLoad} */
export function load(input) {
	return {
		title: input.url.pathname
	};
}
