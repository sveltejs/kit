<script>
	import { getStores } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	const { session } = getStores();
	
	let call_count = 0;

	onMount(() => {
		call_count = get(session);
	});
</script>

<h1>Result</h1>
<h2>Called {call_count} time</h2>