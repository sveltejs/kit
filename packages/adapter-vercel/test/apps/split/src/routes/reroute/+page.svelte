<script>
	import { page } from '$app/state';
</script>

<p>{page.url.pathname + page.url.search}</p>
