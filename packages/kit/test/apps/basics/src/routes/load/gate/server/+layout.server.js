export const gate = true;

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
	// small delay to ensure the page load would see layout_done = false
	// if it ran in parallel
	await new Promise((r) => setTimeout(r, 20));
	/** @type {any} */ (locals).gate_layout_done = true;
	return { from_layout: 'layout_data' };
}
