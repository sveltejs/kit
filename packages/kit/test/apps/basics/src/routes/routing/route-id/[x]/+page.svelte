<script>
	import { page } from '$app/state';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<h1>route.id in load: {data.route.id}</h1>
<h2>route.id in store: {page.route.id}</h2>
