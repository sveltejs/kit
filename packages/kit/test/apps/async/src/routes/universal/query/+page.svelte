<script>
	import { get_count, get_item, get_ticks } from '../universal.js';

	const ids = ['a', 'b', 'c'];

	const ticks = get_ticks();
</script>

<p id="count">{(await get_count()).count} ({(await get_count()).ran_on})</p>

{#each ids as id}
	<p id="item-{id}">{await get_item(id)}</p>
{/each}

<p id="ticks">{await ticks}</p>
<p id="connected">{ticks.connected}</p>

<button id="refresh-count" onclick={() => get_count().refresh()}>refresh count</button>
<button id="refresh-items" onclick={() => ids.forEach((id) => get_item(id).refresh())}>
	refresh items
</button>
<button id="reconnect" onclick={() => ticks.reconnect()}>reconnect</button>

<a href="/universal">back</a>
