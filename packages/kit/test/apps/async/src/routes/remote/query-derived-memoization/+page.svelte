<script>
	import Graph from './Graph.svelte';
	import { get_rows } from './data.remote.js';

	/**
	 * Both modes render the same graph, from the same data, updated the same number of
	 * times. Only the source of the data differs:
	 *
	 * - `promise` feeds it from a plain awaited promise
	 * - `query` feeds it from an awaited remote query
	 *
	 * `promise` is the control. It only counts as one if the graph really re-renders,
	 * which is what `#result` is for — note that `rows` is read synchronously below,
	 * because reading it inside the `setTimeout` callback would leave `plain_promise`
	 * with no reactive dependency and the control would quietly stop testing anything.
	 */
	let mode = $state('query');
	let bucket = $state(0);

	const rows = $derived(Array.from({ length: 10 + bucket }, (_, i) => i));

	const plain_promise = $derived.by(() => {
		const current = rows;
		return new Promise((resolve) => setTimeout(() => resolve(current), 20));
	});
</script>

<label><input type="radio" value="promise" bind:group={mode} /> promise</label>
<label><input type="radio" value="query" bind:group={mode} /> query</label>

<button id="bump" onclick={() => (bucket += 1)}>bump</button>

{#if mode === 'promise'}
	<svelte:boundary>
		{#snippet pending()}<p id="pending">loading</p>{/snippet}
		<Graph rows={await plain_promise} />
	</svelte:boundary>
{:else}
	<svelte:boundary>
		{#snippet pending()}<p id="pending">loading</p>{/snippet}
		<Graph rows={await get_rows({ bucket })} />
	</svelte:boundary>
{/if}
