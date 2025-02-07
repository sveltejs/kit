<script>
	import { onMount } from 'svelte';

	let socket;
	let messages = [];

	onMount(() => {
		socket = new WebSocket('/ws/reject-upgrade');

		socket.onclose = () => {
			console.log('disconnected');
		};

		socket.onmessage = (event) => {
			messages = [...messages, event.data];
		};
	});
</script>

<h1>Messages:</h1>

<div>
	{#each messages as message}
		<p>message from server: {message}</p>
	{/each}
</div>
