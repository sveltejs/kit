<script>
	import { preloadData } from '$app/navigation';
	import { setup } from '../../../../../../setup';
	let data = null;

	async function onClick() {
		const result = await preloadData('/rewrites/preload-data/a');
		data = result.data;
	}

	setup();
</script>

<button on:click={onClick}>Preload</button>

{#if data}
	<pre>{JSON.stringify(data, null, 2)}</pre>
{/if}
