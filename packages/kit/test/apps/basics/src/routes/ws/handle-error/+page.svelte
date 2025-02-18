<script>
	let message = '';
</script>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error?error');
		socket.onerror = () => {
			message = 'error';
		};
	}}>upgrade</button
>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error', ['error']);
		socket.onopen = () => {
			message = 'opened';
		};
	}}>open</button
>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error');
		socket.onopen = () => {
			socket.send('message');
		};
		socket.onmessage = (event) => {
			message = event.data;
		}
	}}>message</button
>

<button
	on:click={() => {
		const socket = new WebSocket('/ws/handle-error');
		socket.onopen = () => {
			socket.send('close');
		};
		socket.onclose = () => {
			message = 'closed';
		}
	}}>close</button
>

<p>{message}</p>