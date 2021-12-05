<script>
	const numbers = [...Array(100).keys()];
</script>

{#each numbers as number}
	<p>{number}</p>
{/each}
