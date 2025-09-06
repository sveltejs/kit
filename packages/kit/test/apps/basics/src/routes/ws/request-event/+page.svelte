<script>
	import { onMount } from 'svelte';

	let ws;
	let message;

	onMount(() => {
		ws = new WebSocket('/ws/request-event');
		ws.onmessage = (event) => {
			message = event.data;
		};
	});
</script>

<p>{message}</p>

<button on:click={() => ws.send('message')}>send message</button>
