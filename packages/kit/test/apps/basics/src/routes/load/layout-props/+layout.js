/** @type {import('./$types').LayoutLoad} */
export async function load() {
	return {
		// Needs to be an object, else Svelte will do by-value-comparison and skip rerender
		obj: {}
	};
}
