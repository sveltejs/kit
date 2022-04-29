<script>
	import { getStores } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	const { session } = getStores();

	let calls = 0;

	onMount(() => {
		({ calls } = get(session));
	});
</script>

<h1>Result</h1>
<h2>Calls: {calls}</h2>
