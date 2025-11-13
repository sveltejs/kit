<script>
	import { browser } from '$app/environment';
	import { refreshAll } from '$app/navigation';
	import {
		add,
		get_count,
		set_count,
		set_count_server_refresh,
		set_count_server_set,
		resolve_deferreds
	} from './query-command.remote.js';
	import { q } from './accessing-env.remote';

	let { data } = $props();

	let command_result = $state(null);

	// we just want it not to be treeshaken away
	q;

	const count = browser ? get_count() : null; // so that we get a remote request in the browser
</script>

<p id="echo-result">{data.echo_result}</p>
<!-- TODO use await here once async lands -->
{#if browser}
	<p id="count-result">
		{#await count then result}{result}{/await} / {count.current} ({count.loading})
	</p>
	<!-- this is just here to check that it is re-requested after the command -->
	{#await add({ a: 2, b: 2 }) then result}{result}{/await}
{/if}
<p id="command-result">{command_result}</p>

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
		command_result = await set_count({ c: 3 }).updates(count);
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
		// slow, else test will not be able to see the override
		// (which we deliberately set to a wrong optimistic value to see it applied before the refresh)
		command_result = await set_count({ c: 5, slow: true }).updates(count.withOverride(() => 6));
	}}
	id="multiply-override-refresh-btn"
>
	command (override + refresh)
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
