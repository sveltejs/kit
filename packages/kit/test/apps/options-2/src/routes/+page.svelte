<script>
	import { base, assets } from '$app/paths';
</script>

<h1>Hello</h1>

<p data-testid="base">base: {base}</p>
<p data-testid="assets">assets: {assets}</p>

<a href="{base}/hello" data-testid="link">Go to /hello</a>

<style>
	a {
		text-decoration: none;
	}
</style>
