<script>
	const p = import('$env/dynamic/private');
</script>

{#await p then envModule}
	<p>{envModule.env.SHOULD_EXPLODE}</p>
{/await}
