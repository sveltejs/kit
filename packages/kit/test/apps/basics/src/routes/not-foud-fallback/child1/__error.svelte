<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export async function load({ status, error }) {
		return {
			props: {
				status,
				error
			}
		};
	}
</script>

<script>
	/** @type {number} */
	export let status;

	/** @type {Error} */
	export let error;
</script>

<h1>child1 error page</h1>
<p>status: {status}</p>
<p>error.message: {error && error.message}</p>
