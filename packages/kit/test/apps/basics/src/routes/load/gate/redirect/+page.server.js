/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	/** @type {any} */ (locals).page_load_ran = true;
	return { loaded: true };
}
