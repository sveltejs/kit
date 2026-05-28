<script lang="ts">
	import { get_items, get_item } from './fan-out.remote.js';

	const pulls = get_items();
	// Direct call to `get_item('1')` should hit the warm cache populated by
	// `get_items()` running just above — no extra fetch should happen.
	const direct = get_item('1');

	const page = await pulls;
</script>

<p id="ssr-fan-out-total">total: {page.total}</p>

{#each page.rows as row, idx (row.key)}
	<p id="ssr-fan-out-result-{idx + 1}">{(await row.query)?.title}</p>
{/each}

<p id="ssr-fan-out-direct">{(await direct)?.title}</p>
