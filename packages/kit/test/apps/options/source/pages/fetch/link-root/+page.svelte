<script>
	/** @type {import('./$types').PageProps} */
	const { data } = $props();
</script>

<h2>Fetch URLs</h2>

<dl>
	<dt>fetch1-url</dt>
	<dd data-testid="fetch1-url">{data.fetchUrl1}</dd>
	<dt>fetch2-url</dt>
	<dd data-testid="fetch2-url">{data.fetchUrl2}</dd>
	<dt>fetch3-url</dt>
	<dd data-testid="fetch3-url">{data.fetchUrl3}</dd>
	<dt>fetch4-url</dt>
	<dd data-testid="fetch4-url">{data.fetchUrl4}</dd>
</dl>

<h2>Fetch Responses</h2>
<dl>
	<dt>fetch1-response</dt>
	<dd data-testid="fetch1-response">{data.fetchResponse1}</dd>
	<dt>fetch2-response</dt>
	<dd data-testid="fetch2-response">{data.fetchResponse2}</dd>
	<dt>fetch3-response</dt>
	<dd data-testid="fetch3-response">{data.fetchResponse3}</dd>
	<dt>fetch4-redirect</dt>
	<dd data-testid="fetch4-redirect">{data.fetchRedirect4}</dd>
</dl>
