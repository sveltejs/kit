<script>
	import { get_event } from './data.remote.js';

	const event = await get_event();
</script>

<p data-id="route">route: {event.route.id}</p>
<p data-id="pathname">pathname: {event.url.pathname}</p>
