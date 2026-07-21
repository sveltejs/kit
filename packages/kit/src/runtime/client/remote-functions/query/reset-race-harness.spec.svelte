<script>
	let { layout_query, page_query, page } = $props();
</script>

<svelte:boundary>
	{#snippet pending()}
		<p data-testid="layout-pending">layout pending</p>
	{/snippet}

	{@const user = await layout_query}
	<p data-testid="layout">{user}</p>
</svelte:boundary>

{#if page.show}
	<svelte:boundary>
		{#snippet pending()}
			<p data-testid="page-pending">page pending</p>
		{/snippet}

		{@const items = await page_query}
		<p data-testid="page">{items}</p>
	</svelte:boundary>
{/if}
