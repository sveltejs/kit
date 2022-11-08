<script>
	import { onMount } from 'svelte';

	onMount(async () => {
		const { is_even } = await import('./_is_even.js');
		console.log(is_even(5));
	});
</script>
