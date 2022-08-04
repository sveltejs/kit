<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').Data} */
	export let data;
</script>

<h1>{data.message}</h1>
<h2>{$page.url.origin}</h2>
