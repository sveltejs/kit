/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		body: {
			pwned: '</script><script>window.pwned = 1</script>'
		}
	};
}
