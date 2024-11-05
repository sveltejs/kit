<script>
	import { browser } from '$app/environment';

	const events = [];
	if (browser) {
		console.log('connecting');
		const websocket = new WebSocket('/ws');

		console.log(websocket);

		websocket.onopen = () => {
			console.log('connected');
			websocket.send('hello');
		};

		websocket.onmessage = (event) => {
			events.push(event.data);
			console.log(event.data);
		};
	}
</script>

<h1>Hello</h1>

<div>
	{#each events as event}
		<p>{event}</p>
	{/each}
</div>
