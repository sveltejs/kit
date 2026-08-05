// @ts-ignore
import cjs from 'e2e-test-dep-hooks-client';
cjs.cjs();

/** @type {import("@sveltejs/kit").HandleClientError} */
export function handleError(input) {
	if (input.kind !== 'unexpected') return input.error;
	return { message: /**@type{any}*/ (input.error).message };
}
