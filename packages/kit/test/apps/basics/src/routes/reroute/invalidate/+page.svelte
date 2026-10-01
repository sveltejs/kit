<script>
	import { refreshAll } from '$app/navigation';

	export let data;
</script>

<button onclick={async () => await refreshAll()}>Refresh</button>

{#if data.request}
	<p>data request: {data.request}</p>
{/if}
