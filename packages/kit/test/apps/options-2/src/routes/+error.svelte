<script>
	import { page } from '$app/state';
	import { resolve, asset } from '$app/paths';
</script>

<h1 data-testid="error-status">{page.status}</h1>

<p data-testid="base">base: {resolve('')}</p>
<p data-testid="assets">assets: {asset('answer.txt').replace('answer.txt', '')}</p>

<a data-testid="layout-link" href={page.data.layout_link}>hello</a>
<a data-testid="layout-asset" href={page.data.layout_asset}>answer</a>
