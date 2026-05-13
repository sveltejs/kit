export const gate = true;

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
	// outer gate must have finished before this runs
	/** @type {any} */ (locals).inner_saw_outer = /** @type {any} */ (locals).outer_done === true;
	await new Promise((r) => setTimeout(r, 10));
	/** @type {any} */ (locals).inner_done = true;
	return {};
}
