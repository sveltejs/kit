<script lang="ts">
	import LiveView from './LiveView.svelte';
	import {
		increment,
		reset,
		drop,
		get_count,
		reconnect_live,
		reconnect_requested_live,
		reconnect_live_form,
		notify_only,
		get_stats
	} from './live.remote.js';

	let show_live = $state(true);
	let stats = $state('pending');

	async function refresh_stats() {
		const next = await get_stats();
		stats = JSON.stringify(next);
	}

	let for_await_count = $state(0);
	let for_await_values = $state('');
	let stop_iteration: AbortController | null = null;

	async function start_for_await() {
		stop_iteration?.abort();
		stop_iteration = new AbortController();
		const signal = stop_iteration.signal;
		for_await_count = 0;
		for_await_values = '';
		const collected: number[] = [];

		try {
			for await (const value of get_count()) {
				if (signal.aborted) break;
				for_await_count += 1;
				collected.push(value);
				for_await_values = collected.join(',');
				if (for_await_count >= 3) break;
			}
		} catch (error) {
			for_await_values = `error: ${(error as Error).message}`;
		}
	}
</script>

<button id="increment" onclick={() => increment()}>increment</button>
<button id="reset" onclick={() => reset()}>reset</button>
<button id="notify-only" onclick={() => notify_only()}>notify only</button>
<button id="drop" onclick={() => drop()}>drop connection</button>
<button id="reconnect-live" onclick={() => reconnect_live()}>reconnect live query</button>
<button id="reconnect-live-requested" onclick={() => reconnect_requested_live().updates(get_count)}>
	reconnect requested live queries
</button>
<form
	{...reconnect_live_form.enhance(async ({ submit }) => {
		await submit();
	})}
>
	<button id="reconnect-live-form" type="submit">reconnect live query (form)</button>
</form>
<button id="toggle-live" onclick={() => (show_live = !show_live)}>toggle live query</button>
<button id="stats" onclick={refresh_stats}>refresh stats</button>

{#if show_live}
	<LiveView />
{:else}
	<p id="detached">detached</p>
{/if}
<p id="stats-value">{stats}</p>

<button id="start-for-await" onclick={start_for_await}>start for-await</button>
<p id="for-await-count">{for_await_count}</p>
<p id="for-await-values">{for_await_values}</p>
