<script>
	import { onMount } from 'svelte';

	let socket;
	let messages = [];

	onMount(() => {
		socket = new WebSocket('/ws');

		socket.onerror = (event) => {
			console.log(event);
		};

		socket.onopen = () => {
			console.log('websocket connected');
			socket.send('ping');
		};

		socket.onclose = () => {
			console.log('disconnected');
		};

		socket.onmessage = (event) => {
			messages = [...messages, event.data];
		};
	});
</script>

<h1>Messages:</h1>

<button
	on:click={() => {
		socket.send('ping');
	}}>ping</button
>
<button on:click={() => socket.send('add')}>add</button>
<button on:click={() => socket.send('broadcast')}>broadcast</button>

<ul>
	{#each messages as message}
		<li>{message}</li>
	{/each}
</ul>
