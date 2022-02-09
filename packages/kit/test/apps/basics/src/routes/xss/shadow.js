/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	const user = {
		name: '</script><script>window.pwned = 1</script>'
	};
	return {
		body: { user }
	};
}
