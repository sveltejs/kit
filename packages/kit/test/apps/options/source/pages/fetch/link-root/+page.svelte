<script>
	/** @type {import('./$types').PageProps} */
	const { data } = $props();
</script>

<h2>Fetch URLs</h2>

<dl>
	{#each data.fetches as item, index}
		<dt>fetch{index + 1}-url</dt>
		<dd data-testid={`fetch${index + 1}-url`}>{item.url}</dd>
	{/each}
</dl>

<h2>Fetch Responses</h2>
<dl>
	{#each data.fetches as item, index}
		<dt>fetch{index + 1}-response</dt>
		<dd data-testid="fetch{index + 1}-response">{item.response}</dd>
	{/each}
</dl>

<h2>Fetch Redirects</h2>
<dl>
	{#each data.fetches as item, index}
		<dt>fetch{index + 1}-redirect</dt>
		<dd data-testid="fetch{index + 1}-redirect">{item.redirect}</dd>
	{/each}
</dl>
