<script>
	import { browser } from '$app/environment';
	import { refreshAll } from '$app/navigation';
	import {
		add,
		get_count,
		get_flaky_count,
		set_count,
		set_count_refresh_all,
		set_count_partial_refresh,
		set_count_partial_refresh_all,
		set_count_server_refresh,
		set_count_server_refresh_after_read,
		set_count_server_set,
		resolve_deferreds
	} from './query-command.remote.js';
	import { q } from './accessing-env.remote';

	const { data } = $props();

	let command_result = $state(/** @type {number | null} */ (null));

	// we just want it not to be treeshaken away
	void q;

	const count = get_count();
	const flaky_ok = get_flaky_count('ok');
	const flaky_fail = get_flaky_count('fail');

	/** @param {unknown} error */
	function get_message(error) {
		if (error instanceof Error) return error.message;

		if (typeof error === 'object' && error && 'message' in error) {
			return String(error.message);
		}

		return String(error);
	}
</script>

<p id="echo-result">{data.echo_result}</p>
<p id="count-result">
	{await count} / {count.current} ({count.loading})
</p>
<!-- this is just here to check that it is re-requested after the command -->
{await add({ a: 2, b: 2 })}
<p id="command-result">{command_result}</p>
<p id="flaky-ok-result">{await flaky_ok}</p>
<svelte:boundary>
	<p id="flaky-fail-result">{await flaky_fail}</p>

	{#snippet failed(error)}
		<p id="flaky-fail-result">{get_message(error)}</p>
	{/snippet}
</svelte:boundary>

<!-- Test pending state for commands -->
{#if browser}
	<p id="command-pending">Command pending: {set_count.pending}</p>
{/if}

<button onclick={() => set_count_server_refresh(0)} id="reset-btn">reset</button>

<button onclick={() => count.refresh()} id="refresh-btn">Refresh</button>

<button onclick={() => count.set(999)} id="set-btn">Set</button>

<button
	onclick={async () => {
		command_result = await set_count({ c: 2 });
	}}
	id="multiply-btn"
>
	command
</button>
<button
	onclick={async () => {
		command_result = await set_count({ c: 3 }).updates(get_count);
	}}
	id="multiply-refresh-btn"
>
	command (targeted refresh)
</button>
<button
	onclick={async () => {
		command_result = await set_count_server_refresh(4);
	}}
	id="multiply-server-refresh-btn"
>
	command (query server refresh)
</button>
<button
	onclick={async () => {
		command_result = await set_count_server_refresh_after_read(6);
	}}
	id="multiply-server-refresh-after-read-btn"
>
	command (query server refresh after read)
</button>
<button
	onclick={async () => {
		// slow, else test will not be able to see the override
		// (which we deliberately set to a wrong optimistic value to see it applied before the refresh)
		command_result = await set_count({ c: 5, slow: true }).updates(
			get_count,
			count.withOverride(() => 6)
		);
	}}
	id="multiply-override-refresh-btn"
>
	command (override + refresh)
</button>
<button
	onclick={async () => {
		command_result = await set_count_partial_refresh(9).updates(get_flaky_count);
	}}
	id="multiply-partial-refresh-btn"
>
	command (partial refresh failure)
</button>
<button
	onclick={async () => {
		command_result = await set_count_refresh_all(10).updates(get_count);
	}}
	id="multiply-refresh-all-btn"
>
	command (requested refreshAll)
</button>
<button
	onclick={async () => {
		command_result = await set_count_partial_refresh_all(11).updates(get_flaky_count);
	}}
	id="multiply-partial-refresh-all-btn"
>
	command (requested refreshAll partial failure)
</button>
<button
	onclick={async () => {
		// deferred for pending state testing
		command_result = await set_count({ c: 7, deferred: true });
	}}
	id="command-deferred-btn"
>
	command (deferred)
</button>
<button
	onclick={async () => {
		command_result = await set_count_server_set(8);
	}}
	id="multiply-server-set-btn"
>
	command (query server set)
</button>

<button id="refresh-all" onclick={() => refreshAll()}>refreshAll</button>
<button id="refresh-remote-only" onclick={() => refreshAll({ includeLoadFunctions: false })}>
	refreshAll (remote functions only)
</button>
<button id="resolve-deferreds" onclick={() => resolve_deferreds()}>Resolve Deferreds</button>

<a href="/remote/event">/remote/event</a>
