<script>
	import { getStores } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';

	const { page, session } = getStores();

	let call_count = 0;

	onMount(() => {
		session.set(call_count);
	});

	const unsubscribe = page.subscribe(() => {
		call_count++;
		session.set(call_count);
	});

	onDestroy(unsubscribe);
</script>

<h1>Test</h1>
<h2>Called {call_count} time</h2>
<a href="result">results</a>
