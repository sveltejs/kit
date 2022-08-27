/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	// Do NOT make this load function depend on something which would cause it to rerun
	return {
		foo: {
			bar: 'Custom layout'
		}
	};
}
