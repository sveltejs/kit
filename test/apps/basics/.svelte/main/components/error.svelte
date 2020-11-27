<script>
	export let status;
	export let error;
</script>

<h1>{status}</h1>

<p>{error.message}</p>

<!-- TODO figure out what to do with stacktraces in prod -->
{#if error.stack}
	<pre>{error.stack}</pre>
{/if}