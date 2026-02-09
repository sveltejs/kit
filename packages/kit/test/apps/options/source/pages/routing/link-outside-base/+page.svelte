<script>
	/** @type {{ data: { fetchUrl: string } }} */
	const { data } = $props();
</script>

<p data-testid="fetch-url">{data.fetchUrl}</p>
