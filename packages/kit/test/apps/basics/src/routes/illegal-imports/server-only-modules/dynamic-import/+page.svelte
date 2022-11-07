<script>
	const mod = import('$lib/test.server.js');
</script>

{#await mod then resolved}
	<p>{resolved.should_explode}</p>
{/await}
