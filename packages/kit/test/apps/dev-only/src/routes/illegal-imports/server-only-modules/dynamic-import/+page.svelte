<script>
	const mod = import('../illegal.server.js');
</script>

{#await mod then resolved}
	<p>{resolved.should_explode}</p>
{/await}
