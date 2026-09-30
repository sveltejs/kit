/**
 * DESCRIPTION
 * @param {VALUES} values
 * @returns {never}
 */
export function CODE(values) {
	const error = new Error(
		`${'CODE'}\n${MESSAGE(values)}\nhttps://next.svelte.dev/e/@sveltejs/kit/${'CODE'}`
	);
	error.name = 'SvelteKit error';
	throw error;
}
