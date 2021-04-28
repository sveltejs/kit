<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export function load({ status, error }) {
		return {
			props: { status, error }
		};
	}
</script>

<script>
	/** @type {number} */
	export let status;
	/** @type {Error} */
	export let error;
</script>

<h1>Error {status}</h1>
<p>{error}</p>
