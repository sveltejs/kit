/** @type{import("@sveltejs/kit").HandleClientError} */
export function handleError({ error }) {
	return { message: /** @type {Error} */ (error).message };
}
