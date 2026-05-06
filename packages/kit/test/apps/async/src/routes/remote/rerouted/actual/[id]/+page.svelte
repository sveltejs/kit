<script>
	import { get_route_info } from './data.remote.ts';

	/** @type {Awaited<ReturnType<typeof get_route_info>> | null} */
	let result = $state(null);

	async function handleClick() {
		result = await get_route_info();
	}
</script>

<button onclick={handleClick}>get route info</button>

{#if result}
	<p data-id="route">route: {result.routeId}</p>
	<p data-id="pathname">pathname: {result.pathname}</p>
	<p data-id="params">params: {JSON.stringify(result.params)}</p>
{/if}
