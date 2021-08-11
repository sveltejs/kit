<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export async function load() {
		return {
			status: 307,
			redirect: './c'
		};
	}
</script>

<h1>Redirecting error page</h1>
