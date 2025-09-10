<script>
	/** @type {WebSocket} */
	let socket;
	let message = '';
</script>

<button
	on:click={() => {
		socket = new WebSocket('/ws/handle-error/close');
		socket.onopen = () => {
			message = 'connected';
		};
		socket.onclose = () => {
			message = 'closed';
		};
	}}>open</button
>

<button
	on:click={() => {
		socket.send('close');
	}}>close</button
>

<p>{message}</p>
