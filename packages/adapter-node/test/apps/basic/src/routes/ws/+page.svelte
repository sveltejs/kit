<script>
	import { onMount } from 'svelte';

	/** @type {string[]} */
	let message = [];

	onMount(() => {
		const ws = new WebSocket('/ws');
		ws.onmessage = (event) => {
			message = [...message, event.data];
		};
	});
</script>

<p>{message}</p>
