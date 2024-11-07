<script>
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	let messages = [];
	let socket
	if (browser) {
		socket = new WebSocket(`${base}/ws`);
		console.log(socket);
		socket.onopen = () => {
			console.log('websocket connected');
			socket.send('ping');
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

<button on:click={() => socket.send('ping')}>ping</button>
<button on:click={() => socket.send('add')}>add</button>
<button on:click={() => socket.send('broadcast')}>broadcast</button>

<div>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>
