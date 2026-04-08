/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^[A-Z]+$/.test(param);
}
