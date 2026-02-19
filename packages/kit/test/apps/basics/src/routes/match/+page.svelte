<script>
	import { match } from '$app/paths';
	import { onMount } from 'svelte';
	import { testPaths } from './const';

	let { data } = $props();

	const clientResults = $state([]);

	onMount(async () => {
		for (const path of testPaths) {
			const result = await match(path);
			clientResults.push({ path, result });
		}
	});
</script>

<h1>Match Test</h1>

<div id="server-results">
	{#each data.serverResults as { path, result }}
		<div class="result" data-path={path}>
			{JSON.stringify(result)}
		</div>
	{/each}
</div>

<div id="client-results">
	{#each clientResults as { path, result }}
		<div class="result" data-path={path}>
			{JSON.stringify(result)}
		</div>
	{/each}
</div>
