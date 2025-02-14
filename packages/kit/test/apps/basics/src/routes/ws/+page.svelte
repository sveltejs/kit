<script>
	/** @type {WebSocket | undefined} */
	let primary_socket;

	/** @type {string[]} */
	let messages = [];
</script>

<button
	on:click={() => {
		primary_socket = new WebSocket('/ws?me');

		primary_socket.onopen = () => {
			messages = [...messages, 'connected'];
		};

		primary_socket.onmessage = (event) => {
			messages = [...messages, event.data];
		};
	}}>open</button
>
<button
	on:click={() => {
		const socket = new WebSocket('/ws');
		socket.onerror = () => {
			messages = [...messages, 'rejected'];
		};
	}}>rejection</button
>
<button on:click={() => primary_socket.send('ping')}>ping</button>
<button
	on:click={() => {
		const socket = new WebSocket('/ws?me');
		socket.onopen = () => {
			socket.send('hello');
		};
	}}>chat</button
>
<button
	on:click={() => {
		const socket = new WebSocket('/ws?me');
		socket.onopen = () => {
			socket.close(1000, 'test');
		};
	}}>join and leave</button
>

<ul>
	{#each messages as message}
		<li>{message}</li>
	{/each}
</ul>
