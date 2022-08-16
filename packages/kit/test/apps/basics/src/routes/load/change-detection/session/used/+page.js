/** @type {import('@sveltejs/kit').Load} */
export async function load({ session }) {
	session;
	return {
		// Needs to be an object, else Svelte will do by-value-comparison and skip rerender
		obj: {}
	};
}
