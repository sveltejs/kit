<script>
	import { resolve, asset } from '$app/paths';
</script>

<h1>Hello</h1>

<p data-testid="base">base: {resolve('')}</p>
<p data-testid="assets">assets: {asset('answer.txt').replace('answer.txt', '')}</p>

<style>
	p {
		color: red;
	}
</style>
