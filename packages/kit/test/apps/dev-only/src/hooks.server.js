/** @type {import("@sveltejs/kit").HandleServerError} */
export function handleError({ kind, error }) {
	if (kind !== 'unexpected') return error;
	return { message: /**@type{any}*/ (error).message };
}
