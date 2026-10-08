<script>
	const { children } = $props();
</script>

<p>{await Promise.resolve('ok')}</p>

<svelte:boundary>
	{#snippet pending()}
		<p>loading...</p>
	{/snippet}

	{@render children()}
</svelte:boundary>
