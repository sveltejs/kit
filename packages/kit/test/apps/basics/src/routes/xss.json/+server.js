export function GET() {
	const user = {
		name: '</script><script>window.pwned = 1</script>'
	};
	return new Response(JSON.stringify(user), {
		headers: { 'content-type': 'application/json; charset=utf-8' }
	});
}
