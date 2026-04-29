<script>
	import { auto_count, bfcache_count, stale_count } from './lifetime.remote.js';

	let show_stale_child = $state(false);
	let show_bfcache = $state(true);

	const auto = auto_count();
	const stale = stale_count();
</script>

<p id="auto-count">{await auto}</p>
<p id="stale-count">{await stale}</p>

<button id="show-stale-child" onclick={() => (show_stale_child = true)}>show stale child</button>
{#if show_stale_child}
	<p id="stale-child-count">{await stale_count()}</p>
{/if}

<button id="toggle-bfcache" onclick={() => (show_bfcache = !show_bfcache)}>toggle bfcache</button>
{#if show_bfcache}
	<!-- {@const bfcache = bfcache_count()} TODO why does this fail -->
	<p id="bfcache-count">{await bfcache_count()}</p>
{:else}
	<p id="bfcache-detached">detached</p>
{/if}
