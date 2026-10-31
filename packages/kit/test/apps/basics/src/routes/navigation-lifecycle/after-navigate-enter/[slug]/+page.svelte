<script>
	import { afterNavigate } from '$app/navigation';

	/** @type {string | null | undefined} */
	let route_id;
	/** @type {string | undefined} */
	let params;
	let from = '';

	afterNavigate((navigation) => {
		from = JSON.stringify(navigation.from);
		route_id = navigation.to?.route.id;
		params = JSON.stringify(navigation.to?.params);
	});
</script>

<h1>route: {route_id}</h1>
<p>params: {params}</p>
<pre>{from}</pre>
