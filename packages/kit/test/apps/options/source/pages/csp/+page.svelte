<script>
	import { page } from '$app/state';
</script>

<svelte:head>
	<script src="http://localhost:{page.url.searchParams.get('port')}/blocked.js"></script>
</svelte:head>
