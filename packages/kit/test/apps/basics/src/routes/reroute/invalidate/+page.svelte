<script>
	import { invalidateAll } from '$app/navigation';

	export let data;
</script>

<button on:click={async () => await invalidateAll()}>Invalidate</button>

{#if data.request}
	<p>data request: {data.request}</p>
{/if}
