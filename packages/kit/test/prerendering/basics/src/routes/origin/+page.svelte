<script>
	import { page } from '$app/state';

	/** @type {{ data: import('./$types').PageData }} */
	const { data } = $props();
</script>

<h1>{data.message}</h1>
<h2>{page.url.origin}</h2>
