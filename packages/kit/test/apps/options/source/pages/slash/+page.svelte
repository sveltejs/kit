<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
</script>

<h2>{$page.url.pathname}</h2>

<a data-testid="child" href="{base}/slash/child">/slash/child</a>
