<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>route.id in load: {data.route.id}</h1>
<h2>route.id in store: {$page.route.id}</h2>
