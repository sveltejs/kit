<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>static</h1>
<h2>{data.path}</h2>
<h3>{$page.url.pathname}</h3>
