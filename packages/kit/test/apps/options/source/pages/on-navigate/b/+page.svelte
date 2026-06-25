<script>
	import { onMount } from 'svelte';

	// @ts-ignore i guess svelte-check doesn't see the right config?
	await new Promise((resolve) => setTimeout(resolve, 500));

	onMount(() => {
		console.log('mounted');
	});
</script>

<h1>Page B</h1>
