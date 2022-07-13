<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	console.error(`\n======\nbase: ${base}\n$page.url.pathname: ${$page.url.pathname}\n======\n`);
</script>

<h2>{$page.url.pathname.replace(base, '')}</h2>

<a href="{base}/slash/child">/slash/child</a>
