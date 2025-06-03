<script>
	import { browser } from '$app/environment';
	import { refreshAll } from '$app/navigation';
	import { add, get_count, set_count, set_count_server } from './query-command.remote.js';

	let { data } = $props();

	let command_result = $state(null);
	let release;

	const count = browser ? get_count() : null; // so that we get a remote request in the browser
</script>

<p id="echo-result">{data.echo_result}</p>
<!-- TODO use await here once async lands -->
{#if browser}
	<p id="count-result">
		{#await count then result}{result}{/await} / {count.current} ({count.pending})
	</p>
	<!-- this is just here to check that it is re-requested after the command -->
	{#await add(2, 2) then result}{result}{/await}
{/if}
<p id="command-result">{command_result}</p>

<button onclick={() => set_count_server(0)} id="reset-btn">reset</button>

<button onclick={() => count.refresh()} id="refresh-btn">Refresh</button>

<button
	onclick={async () => {
		release = await count.override((count) => count + 10);
	}}
	id="override-btn">Override</button
>

<button onclick={() => release?.()} id="release-btn">Release</button>

<button
	onclick={async () => {
		command_result = await set_count(2);
	}}
	id="multiply-btn"
>
	command
</button>
<button
	onclick={async () => {
		command_result = await set_count(3);
		count.refresh();
	}}
	id="multiply-refresh-btn"
>
	command (targeted refresh)
</button>
<button
	onclick={async () => {
		command_result = await set_count_server(4);
	}}
	id="multiply-server-refresh-btn"
>
	command (query server refresh)
</button>

<button id="refresh-all" onclick={() => refreshAll()}>refreshAll</button>
<button id="refresh-remote-only" onclick={() => refreshAll({ includeLoadFunctions: false })}>
	refreshAll (remote functions only)
</button>
