// @ts-ignore
import cjs from 'e2e-test-dep-hooks-client';
cjs.cjs();

/** @type {import("@sveltejs/kit").HandleClientError} */
export function handleError({ kind, error }) {
	if (kind !== 'unknown') return error;
	return { message: /**@type{any}*/ (error).message };
}
