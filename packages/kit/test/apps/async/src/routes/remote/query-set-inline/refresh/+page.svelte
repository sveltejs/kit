<script>
	import { get_thing, get_things_refresh } from '../data.remote.js';

	// `get_things_refresh()` calls `get_thing(id).refresh()` on the server. It is
	// awaited during SSR (so the `.refresh()` calls run server-side), but the
	// individual `get_thing(id)` queries are deliberately NOT awaited until the
	// client reveals them, so the only way they can be reused without a network
	// request is if the parent's `.refresh()` values were inlined into the HTML.
	const things = get_things_refresh();

	let show = $state(false);
</script>

<p id="ids">{(await things).join(',')}</p>

<button id="show" onclick={() => (show = true)}>show</button>

{#if show}
	{#each await things as id (id)}
		<p id="thing-{id}">{await get_thing(id)}</p>
	{/each}
{/if}
