<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const { data } = $props();

	let ws_message = $state('');
	let ws: WebSocket;
	onMount(() => {
		ws = new WebSocket(`${page.url.origin}/ws`);
		ws.addEventListener('message', (event) => {
			ws_message = event.data;
		});
		return () => ws.close();
	})
</script>

<h1>Sum: {data.sum}</h1>

<h2>WebSocket message: {ws_message}</h2>
