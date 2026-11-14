<script>
	import Eager from './Eager.svelte';

	let { data } = $props();
</script>

<h1>css</h1>
<Eager />

{#if data.Lazy}
	<data.Lazy />
{/if}

<style>
	h1 {
		color: rgb(1, 2, 3);
	}
</style>
