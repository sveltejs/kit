/** @type {import("@sveltejs/kit").HandleServerError} */
export function handleError(input) {
	if (input.kind !== 'unexpected') return input.error;
	return { message: /**@type{any}*/ (input.error).message };
}
