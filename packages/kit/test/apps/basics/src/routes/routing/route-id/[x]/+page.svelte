<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').Data} */
	export let data;
</script>

<h1>routeId in load: {data.routeId}</h1>
<h2>routeId in store: {$page.routeId}</h2>
