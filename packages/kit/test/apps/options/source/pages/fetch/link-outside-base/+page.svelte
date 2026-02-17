<script>
	/** @type {import('./$types').PageProps} */
	const { data } = $props();
</script>

<p data-testid="fetch-url">{data.fetchUrl}</p>
<p data-testid="fetch-response">{data.fetchResponse}</p>
