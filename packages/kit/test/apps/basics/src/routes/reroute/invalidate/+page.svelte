<script>
	import { invalidateAll } from '$app/navigation';

	export let data;
</script>

<button onclick={async () => await invalidateAll()}>Invalidate</button>

{#if data.request}
	<p>data request: {data.request}</p>
{/if}
