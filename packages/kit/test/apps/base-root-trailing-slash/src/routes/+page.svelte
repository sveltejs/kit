<script>
	import { resolve } from '$app/paths';
</script>

<h1>Root</h1>

<p data-testid="base">base: {resolve('')}</p>

<a href={resolve('/about')}>About</a>
