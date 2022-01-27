<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<script src="http://localhost:{$page.url.searchParams.get('port')}/blocked.js"></script>
</svelte:head>
