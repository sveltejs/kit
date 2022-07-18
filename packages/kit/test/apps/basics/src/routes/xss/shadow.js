/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	const user = {
		name: '</script><script>window.pwned = 1</script>'
	};
	return {
		body: { user }
	};
}
