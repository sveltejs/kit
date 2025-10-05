<script>
	import { get_event } from './data.remote.js';
</script>

<!-- TODO use inline await when we can -->
{#await get_event() then event}
	<p data-id="route">route: {event.route.id}</p>
	<p data-id="pathname">pathname: {event.url.pathname}</p>
{/await}
