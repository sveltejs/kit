<script>
	const mod = import('$lib/blah/server/something/private.js');
</script>

{#await mod then resolved}
	<p>{resolved.should_explode}</p>
{/await}
