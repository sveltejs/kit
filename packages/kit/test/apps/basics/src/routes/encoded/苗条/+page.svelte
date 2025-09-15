<script>
	import { page } from '$app/state';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<h1>static</h1>
<h2>{data.path}</h2>
<h3>{page.url.pathname}</h3>
