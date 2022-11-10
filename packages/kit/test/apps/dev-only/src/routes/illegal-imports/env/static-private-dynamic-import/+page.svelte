<script>
	const p = import('$env/static/private');
</script>

{#await p then envModule}
	<p>{envModule.SHOULD_EXPLODE}</p>
{/await}
