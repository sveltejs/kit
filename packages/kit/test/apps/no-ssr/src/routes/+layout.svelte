<script>
	import { setup } from '../../../../setup.js';

	/** @type {import('./$types').LayoutData} */
	export let data;

	setup();
</script>

<slot />

<footer id="server-route-id">{data?.server_route_id}</footer>
