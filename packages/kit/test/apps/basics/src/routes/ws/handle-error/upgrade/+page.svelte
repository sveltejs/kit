<script>
	let message = '';
</script>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error/upgrade');
		socket.onerror = () => {
			message = 'error';
		};
	}}>upgrade</button
>

<p>{message}</p>
