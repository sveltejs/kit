<script>
	let message = '';
</script>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error/open');
		socket.onmessage = (event) => {
			message = event.data;
		};
	}}>open</button
>

<p>{message}</p>
