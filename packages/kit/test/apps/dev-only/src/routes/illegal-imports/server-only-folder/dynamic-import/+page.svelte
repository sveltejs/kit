<script>
	const mod = import('$lib/server/blah/test.js');
</script>

{#await mod then resolved}
	<p>{resolved.should_explode}</p>
{/await}
