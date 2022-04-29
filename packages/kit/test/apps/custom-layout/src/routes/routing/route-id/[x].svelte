<script context="module">
	/** @type {import('./[x]').Load} */
	export function load({ routeId }) {
		return {
			props: { routeId }
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {string} */
	export let routeId;
</script>

<h1>routeId in load: {routeId}</h1>
<h2>routeId in store: {$page.routeId}</h2>
