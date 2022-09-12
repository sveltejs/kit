/** @type {import("@sveltejs/kit").HandleServerError} */
export function handleError({ error }) {
	return { message: /**@type{any}*/ (error).message };
}
