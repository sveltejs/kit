<script>
	export let data;
</script>

<p data-testid="auto">{data.auto}</p>
<p data-testid="url">{data.url}</p>
<p data-testid="no_inline">{data.no_inline}</p>
<p data-testid="fragment">{data.fragment}</p>
<p data-testid="query_and_fragment">{data.query_and_fragment}</p>
<p data-testid="content_type">{data.content_type}</p>
<p data-testid="external_no_inline">{data.external_no_inline}</p>
<p data-testid="styles">{data.styles}</p>
<p data-testid="local_glob">{data.local_glob}</p>
<p data-testid="external_glob">{data.external_glob}</p>
<div data-testid="svg">{@html data.svg}</div>
