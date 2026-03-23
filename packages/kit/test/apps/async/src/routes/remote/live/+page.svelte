<script lang="ts">
	import LiveView from './LiveView.svelte';
	import { increment, reset, drop, reconnect_live, get_stats } from './live.remote.js';

	let show_live = $state(true);
	let stats = $state('pending');

	async function refresh_stats() {
		const next = await get_stats().run();
		stats = JSON.stringify(next);
	}
</script>

<button id="increment" onclick={() => increment()}>increment</button>
<button id="reset" onclick={() => reset()}>reset</button>
<button id="drop" onclick={() => drop()}>drop connection</button>
<button id="reconnect-live" onclick={() => reconnect_live()}>reconnect live query</button>
<button id="toggle-live" onclick={() => (show_live = !show_live)}>toggle live query</button>
<button id="stats" onclick={refresh_stats}>refresh stats</button>

{#if show_live}
	<LiveView />
{:else}
	<p id="detached">detached</p>
{/if}
<p id="stats-value">{stats}</p>
