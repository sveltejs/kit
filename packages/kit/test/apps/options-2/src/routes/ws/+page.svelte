<script>
	import { browser } from '$app/environment';
	import { base } from '$app/paths';

	let messages = [];

	if (browser) {
		const socket = new WebSocket(`${base}/ws`);

		console.log(socket);

		socket.onopen = () => {
			console.log('websocket connected');
			socket.send('hello world');
		};

		socket.onclose = () => {
			console.log('disconnected');
		};

		socket.onmessage = (event) => {
			console.log(event.data);
			messages = [...messages, event.data];
			console.log(messages);
		};
	}
</script>

<h1>Messages:</h1>

<div>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>
