/** @type {import('@sveltejs/kit').Load} */
export async function load({ session }) {
	session; // not necessary, but prevents the argument from being marked as unused
	return {
		// Needs to be an object, else Svelte will do by-value-comparison and skip rerender
		obj: {}
	};
}
