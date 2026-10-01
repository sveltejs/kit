<script>
	import Component from './Component.svelte';

	let show = false;
</script>

<h1 id="always">This is always rendered</h1>

<button on:click={() => (show = !show)}>show component</button>

{#if show}
	<Component />
{/if}

<style>
	h1 {
		color: red;
	}
</style>
