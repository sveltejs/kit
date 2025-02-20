<script>
	/** @type {WebSocket | undefined} */
	let primary_socket;

	/** @type {WebSocket | undefined} */
	let secondary_socket;

	/** @type {string[]} */
	let messages = [];
</script>

<button
	on:click={() => {
		primary_socket = new WebSocket('/ws', ['foo', 'bar']);

		primary_socket.onopen = () => {
			messages = [...messages, 'connected', `protocol: ${primary_socket.protocol}`];
		};

		primary_socket.onmessage = (event) => {
			messages = [...messages, event.data];
		};
	}}>open</button
>
<button on:click={() => primary_socket.send('ping')}>ping</button>
<button
	on:click={() => {
		primary_socket.send('hello');
	}}>chat</button
>
<button
	on:click={() => {
		secondary_socket = new WebSocket('/ws');

		secondary_socket.onopen = () => {
			messages = [...messages, 'joined the chat'];
		};

		secondary_socket.onmessage = (event) => {
			messages = [...messages, event.data];
		};

		secondary_socket.onclose = () => {
			messages = [...messages, 'left the chat'];
		};
	}}>join</button
>
<button
	on:click={() => {
		secondary_socket.send('close');
	}}>leave</button
>

<ul>
	{#each messages as message}
		<li>{message}</li>
	{/each}
</ul>
