<script>
	import { preloadData } from '$app/navigation';

	/** @type {Record<string, any> | null} */
	let result = null;

	async function preload() {
		result = await preloadData('/preloading/preload-error/target');
	}
</script>

<button on:click={preload}>Preload</button>

{#if result}
	<pre id="result">{JSON.stringify(result)}</pre>
{/if}
