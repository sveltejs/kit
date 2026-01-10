<script>
	import Conditional from './Conditional.svelte';

	let show = $state(false);
</script>

<section>
	<button onclick={() => (show = !show)}>Toggle</button>

	{#if show}
		<Conditional />
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
		background-color: beige;
	}
</style>
