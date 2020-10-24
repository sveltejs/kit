<script>
	import { createEventDispatcher } from 'svelte';

	export let tags;
	const dispatch = createEventDispatcher();
</script>

{#if tags}
	<div className="tag-list">
		{#each tags as tag}
			<a href="." class="tag-default tag-pill" on:click='{() => dispatch("select", { tag })}'>
				{tag}
			</a>
		{/each}
	</div>
{:else}
	<div>Loading Tags...</div>
{/if}