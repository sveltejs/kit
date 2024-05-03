<script>
	import { onMount } from 'svelte';

	let message = '';

	onMount(() => {
		message = 'hello world!';
	});
</script>

<p>{message}</p>
