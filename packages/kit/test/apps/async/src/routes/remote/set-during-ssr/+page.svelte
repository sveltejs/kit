<script>
	import { onMount } from 'svelte';
	import { get_items } from './set-during-ssr.remote.js';

	let hydrated = $state(false);

	onMount(() => {
		hydrated = true;
	});
</script>

<div id="hydrated">{hydrated}</div>

{#each await get_items() as id}
	<a href="/remote/set-during-ssr/{id}">item {id}</a>
{/each}
