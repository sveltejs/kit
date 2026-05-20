<script>
	import { resolve, asset } from '$app/paths';
</script>

<h1>Hello</h1>

<p data-testid="base">base: {resolve('/')}</p>
<p data-testid="assets">assets: {asset('/')}</p>

<a href={resolve('/hello')} data-testid="link">Go to /hello</a>

<style>
	a {
		text-decoration: none;
	}
</style>
