/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	return {
		layout_was_done: /** @type {any} */ (locals).gate_layout_done === true
	};
}
