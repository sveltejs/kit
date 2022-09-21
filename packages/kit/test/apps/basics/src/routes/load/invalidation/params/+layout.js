/** @type {import('./$types').LayoutLoad} */
export function load({ params }) {
	return {
		a: params.a,
		b: params.b
	};
}
