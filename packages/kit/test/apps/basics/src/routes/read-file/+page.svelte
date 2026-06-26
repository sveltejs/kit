<script>
	export let data;
</script>

<p data-testid="auto">{data.auto}</p>
<p data-testid="url">{data.url}</p>
<p data-testid="styles">{data.styles}</p>
<p data-testid="local_glob">{data.local_glob}</p>
<p data-testid="external_glob">{data.external_glob}</p>
<div data-testid="svg">{@html data.svg}</div>
