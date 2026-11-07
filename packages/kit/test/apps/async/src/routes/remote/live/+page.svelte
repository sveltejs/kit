<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import LiveView from './LiveView.svelte';
	import {
		increment,
		reset,
		drop,
		get_count,
		get_finite_count,
		reconnect_live,
		reconnect_requested_live,
		reconnect_live_form,
		notify_only,
		get_stats
	} from './live.remote.js';

	let show_live = $state(true);
	let stats = $state('pending');

	async function refresh_stats() {
		get_stats().refresh();
		stats = JSON.stringify(await get_stats());
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

	let stream_log = $state('');
	let stream_iteration: AbortController | null = null;

	async function start_stream_log() {
		stream_iteration?.abort();
		stream_iteration = new AbortController();
		const signal = stream_iteration.signal;
		stream_log = '';
		const collected: number[] = [];

		try {
			for await (const value of get_count()) {
				if (signal.aborted) break;
				collected.push(value);
				stream_log = collected.join(',');
			}
		} catch (error) {
			stream_log = `error: ${(error as Error).message}`;
		}
	}

	let refresh_state = $state('idle');

	async function run_refresh_all() {
		refresh_state = 'pending';
		try {
			await refreshAll();
			refresh_state = 'resolved';
		} catch {
			refresh_state = 'rejected';
		}
	}

	let overlapping_results = $state<string[]>([]);

	async function run_overlapping_updates(update: () => Promise<void>, stagger = false) {
		overlapping_results = ['pending', 'pending', 'pending'];
		for (let i = 0; i < overlapping_results.length; i += 1) {
			update().then(
				() => (overlapping_results[i] = 'fulfilled'),
				() => (overlapping_results[i] = 'rejected')
			);
			// refreshAll() batches synchronous calls, so let invalidation begin first.
			if (stagger) await Promise.resolve();
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

<button id="start-stream-log" onclick={start_stream_log}>start stream log</button>
<p id="stream-log">{stream_log}</p>
<button id="run-refresh-all" onclick={run_refresh_all}>refresh all</button>
<p id="refresh-state">{refresh_state}</p>

<button
	id="overlapping-reconnect"
	onclick={() => run_overlapping_updates(() => get_count().reconnect())}
>
	overlapping reconnects
</button>
<button
	id="overlapping-finite-reconnect"
	onclick={() => run_overlapping_updates(() => get_finite_count().reconnect())}
>
	overlapping finite reconnects
</button>
<button id="overlapping-refresh" onclick={() => run_overlapping_updates(refreshAll, true)}>
	overlapping refreshes
</button>
{#each overlapping_results as result}
	<p class="overlapping-result">{result}</p>
{/each}
