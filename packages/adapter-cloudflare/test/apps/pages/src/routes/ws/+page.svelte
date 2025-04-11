<script>
	import { onMount } from 'svelte';

	let message = '';

	onMount(() => {
		const ws = new WebSocket('/ws');
		ws.onmessage = (event) => {
			message = event.data;
		};
	});
</script>

<p>{message}</p>
