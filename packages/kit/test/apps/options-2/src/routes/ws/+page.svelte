<script>
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	let messages = [];
	let socket1, socket2;
	onMount(() => {
		socket1 = new WebSocket(`${base}/ws`);
		console.log(socket1);
		socket1.onerror = (event) => {
			console.log(event);
		};
		socket1.onopen = () => {
			console.log('websocket connected');
			socket1.send('ping');
		};
		socket1.onclose = () => {
			console.log('disconnected');
		};
		socket1.onmessage = (event) => {
			console.log(event.data);
			messages = [...messages, event.data];
			console.log(messages);
		};

		socket2 = new WebSocket(`${base}/reject-socket`);
		console.log(socket2);
		socket2.onopen = () => {
			console.log('websocket connected');
			socket2.send('ping');
		};
		socket2.onclose = () => {
			console.log('disconnected');
		};
		socket2.onmessage = (event) => {
			console.log(event.data);
			messages = [...messages, event.data];
			console.log(messages);
		};
	});
</script>

<h1>Messages:</h1>

<button
	on:click={() => {
		socket1.send('ping');
		socket2.send('ping');
	}}
>
	ping
</button>
<button on:click={() => socket1.send('add')}>add</button>
<button on:click={() => socket1.send('broadcast')}>broadcast</button>

<div>
	{#each messages as message}
		<p>message from server: {message}</p>
	{/each}
</div>
