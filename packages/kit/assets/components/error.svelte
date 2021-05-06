<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export function load({ error, status }) {
		return {
			props: { error, status }
		};
	}
</script>

<script>
	/** @type {number} */
	export let status;

	/** @type {Error} */
	export let error;
</script>

<h1>{status}</h1>

<p>{error.message}</p>

<!-- TODO figure out what to do with stacktraces in prod -->
{#if error.stack}
	<pre>{error.stack}</pre>
{/if}
