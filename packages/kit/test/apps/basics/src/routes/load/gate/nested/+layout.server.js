export const gate = true;

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
	await new Promise((r) => setTimeout(r, 20));
	/** @type {any} */ (locals).outer_done = true;
	return {};
}
