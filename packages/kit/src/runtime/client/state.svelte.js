/** @type {import('@sveltejs/kit').Page} */
export const page = new class Page {
	data = $state.raw({})
	form = $state.raw(null)
	error = $state.raw(null)
	/** @type {Record<string, string>} */
	params = $state.raw({})
	route = $state.raw({
		id: null
	})
	state = $state.raw({})
	status = $state.raw(-1)
	url = $state.raw(new URL('https://example.com'))
}
