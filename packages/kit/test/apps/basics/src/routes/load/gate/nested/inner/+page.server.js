/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	return {
		inner_saw_outer: /** @type {any} */ (locals).inner_saw_outer === true,
		page_saw_inner: /** @type {any} */ (locals).inner_done === true
	};
}
