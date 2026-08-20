/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^[a-z]+$/.test(param);
}
