/** @type {import('@sveltejs/kit').ParamParser<number>} */
export function parse(param) {
	const n = Number(param);
	if (!Number.isFinite(n)) throw new Error('not a number');
	return n;
}
