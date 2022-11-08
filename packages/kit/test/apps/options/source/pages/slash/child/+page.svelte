<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
</script>

<h2>{$page.url.pathname.replace(base, '')}</h2>
