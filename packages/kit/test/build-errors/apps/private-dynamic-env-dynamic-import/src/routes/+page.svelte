<script>
	const p = import('$env/dynamic/private');
</script>

{#await p}
	<p>Awaiting...</p>
{:then envModule}
	<p>{envModule.env.SHOULD_EXPLODE}</p>
{/await}
