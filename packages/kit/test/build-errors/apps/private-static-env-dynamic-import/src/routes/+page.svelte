<script>
	const p = import('$env/static/private');
</script>

{#await p}
	<p>Awaiting...</p>
{:then envModule}
	<p>{envModule.SHOULD_EXPLODE}</p>
{/await}
