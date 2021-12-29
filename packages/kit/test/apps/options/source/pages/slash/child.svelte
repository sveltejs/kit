<script>
	import { base } from '$app/paths';
	import { route } from '$app/stores';
</script>

<h2>{$route.url.pathname.replace(base, '')}</h2>
