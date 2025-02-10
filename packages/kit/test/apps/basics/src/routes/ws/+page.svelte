<script>
	/** @type {WebSocket | undefined} */
	let socket;

	/** @type {string[]} */
	let messages = [];
</script>

<button
	on:click={() => {
		socket = new WebSocket('/ws');

		socket.onopen = () => {
			messages = ['connected'];
		};

		socket.onmessage = (event) => {
			messages = [...messages, event.data];
		};

		socket.onerror = (event) => {
			console.error(event);
			messages = [...messages, 'error'];
		};

		socket.onclose = () => {
			messages = [...messages, 'disconnected'];
		};
	}}>open</button
>
<button
	on:click={() => {
		socket.send('ping');
	}}>ping</button
>
<button on:click={() => socket.send('add')}>add</button>
<button on:click={() => socket.send('broadcast')}>broadcast</button>
<button on:click={() => socket.send('error')}>error</button>
<button on:click={() => socket.close()}>close</button>

<ul>
	{#each messages as message}
		<li>{message}</li>
	{/each}
</ul>
