<script>
	const p = import('$app/env/private');
</script>

{#await p}
	<p>Awaiting...</p>
{:then envModule}
	<p>{envModule.SHOULD_EXPLODE}</p>
{/await}
