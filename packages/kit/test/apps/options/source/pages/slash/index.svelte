<script>
	import { base } from '$app/paths';
	import { url } from '$app/stores';
</script>

<h2>{$url.pathname.replace(base, '')}</h2>

<a href="{base}/slash/child">/slash/child</a>
