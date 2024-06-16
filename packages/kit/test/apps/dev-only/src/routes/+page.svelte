<script>
	import { onMount } from 'svelte';

	let message = '';

	onMount(() => {
		message = 'hello world!';
	});
</script>

<p>{message}</p>

<a href="/optimize-deps">Go to /optimize-deps</a>
