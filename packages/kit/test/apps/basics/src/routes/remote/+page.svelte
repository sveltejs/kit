<script>
	import { browser } from '$app/environment';
	import { refreshAll } from '$app/navigation';
	import { add, add2, multiply, server_refresh } from './query-command.remote.js';

	let { data } = $props();

	let command_result = $state(null);

	const data_add = browser ? add(2, 3) : null; // so that we get a remote request in the browser
</script>

<p id="echo-result">{data.echo_result}</p>
<!-- TODO use await here once async lands -->
{#if browser}
	<p id="sum-result">
		{#await data_add then sum_result}{sum_result}{/await} / {data_add.current} ({data_add.pending})
	</p>
	<!-- this is just here to check that it is re-requested after the command -->
	{#await add2(2, 2) then sum_result}{sum_result}{/await}
{/if}
<p id="command-result">{command_result}</p>

<button onclick={() => data_add.refresh()} id="refresh-btn">Refresh</button>
<button
	onclick={() => {
		data_add.override(99);
	}}
	id="override-btn">Override</button
>

<button
	onclick={async () => {
		command_result = await multiply(1, 2);
	}}
	id="multiply-btn"
>
	command
</button>
<button
	onclick={async () => {
		command_result = await multiply(1, 2);
		data_add.refresh();
	}}
	id="multiply-refresh-btn"
>
	command (targeted refresh)
</button>
<button
	onclick={async () => {
		command_result = await server_refresh();
	}}
	id="multiply-server-refresh-btn"
>
	command (query server refresh)
</button>

<button id="refresh-all" onclick={() => refreshAll()}>refreshAll</button>
<button id="refresh-remote-only" onclick={() => refreshAll({ includeLoadFunctions: false })}>
	refreshAll (remote functions only)
</button>
