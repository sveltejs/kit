<script>
	import { onMount } from 'svelte';

	await new Promise((resolve) => setTimeout(resolve, 500));

	onMount(() => {
		console.log('mounted');
	});
</script>

<h1>Page B</h1>
