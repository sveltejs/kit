<script>
	import { afterNavigate } from '$app/navigation';

	/** @type {string | null | undefined} */
	let route_id;
	/** @type {string | undefined} */
	let params;

	afterNavigate((navigation) => {
		route_id = navigation.to?.route.id;
		params = JSON.stringify(navigation.to?.params);
	});
</script>

<h1>route: {route_id}</h1>
<p>params: {params}</p>
