<script>
	import { page } from '$app/state';
	import { resolve, asset } from '$app/paths';
</script>

<h1 data-testid="error-status">{page.status}</h1>

<p data-testid="base">base: {resolve('/')}</p>
<p data-testid="assets">assets: {asset('/')}</p>
