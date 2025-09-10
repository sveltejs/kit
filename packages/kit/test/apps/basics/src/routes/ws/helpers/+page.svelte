<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	let messages = [];

	onMount(() => {
		const ws = new WebSocket('/ws/helpers');

		ws.onopen = () => {
			messages = ['connected'];
		};

		ws.onmessage = (event) => {
			messages = [...messages, event.data];
		};
	});
</script>

<ul>
	{#each messages as message}
		<li>{message}</li>
	{/each}
</ul>

<form method="post" action="?/publish" use:enhance>
	<button>create user</button>
</form>

<form method="post" action="?/peers" use:enhance>
	<button>message all peers</button>
</form>
