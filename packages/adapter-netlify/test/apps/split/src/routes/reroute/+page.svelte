<script>
	import { page } from '$app/stores';
</script>

<p>{$page.url.pathname + $page.url.search}</p>
