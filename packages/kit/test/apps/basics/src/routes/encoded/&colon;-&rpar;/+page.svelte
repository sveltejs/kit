<script>
	import { page } from '$app/stores';
</script>

<h1>{$page.params.pathname.split('/').pop()}</h1>
