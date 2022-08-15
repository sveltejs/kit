/** @type {import('./$types').PageServerLoad} */
export function load() {
	const user = {
		name: '</script><script>window.pwned = 1</script>'
	};
	return { user };
}
