<script>
	import { browser } from '$app/environment';
	import { add, add2, multiply } from './query-command.remote.js';

	let { data } = $props();

	let multiply_result = $state(null);
</script>

<p id="echo-result">{data.echo_result}</p>
<!-- TODO use await here once async lands -->
{#if browser}
	<p id="sum-result">{#await add(2, 3) then sum_result}{sum_result}{/await}</p>
	<!-- this is just here to check that it is re-requested after the command -->
	{#await add2(2, 2) then sum_result}{sum_result}{/await}
{/if}
<p id="multiply-result">{multiply_result}</p>

<button onclick={() => add.refresh()} id="refresh-btn">Refresh</button>
<button onclick={() => add.override([2, 3], () => 99)} id="override-btn">Override</button>

<button
	onclick={async () => {
		multiply_result = await multiply(1, 2);
	}}
	id="multiply-btn"
>
	command
</button>
<button
	onclick={async () => {
		multiply_result = await multiply(1, 2);
		add.refresh();
	}}
	id="multiply-refresh-btn"
>
	command (targeted refresh)
</button>
