/** @type {import("@sveltejs/kit").HandleServerError} */
export function handleError({ kind, error }) {
	if (kind !== 'unknown') return error;
	return { message: /**@type{any}*/ (error).message };
}
