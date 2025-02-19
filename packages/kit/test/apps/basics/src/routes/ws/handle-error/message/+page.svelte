<script>
	let message = '';
</script>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error/message');
		socket.onopen = () => {
			socket.send('message');
		};
		socket.onmessage = (event) => {
			message = event.data;
		};
	}}>message</button
>

<p>{message}</p>
