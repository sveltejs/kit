/** @type {import('./$types').LayoutLoad} */
export async function load({ data }) {
	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		...data,
		foo: {
			bar: 'Custom layout'
		}
	};
}
