<script>
	import Graph from './Graph.svelte';
	import { get_rows } from './data.remote.js';

	// the argument changes on every bump, so each bump awaits a fresh query instance
	let bucket = $state(0);
</script>

<button id="bump" onclick={() => (bucket += 1)}>bump</button>

<svelte:boundary>
	{#snippet pending()}<p>loading</p>{/snippet}
	<Graph rows={await get_rows(bucket)} />
</svelte:boundary>
