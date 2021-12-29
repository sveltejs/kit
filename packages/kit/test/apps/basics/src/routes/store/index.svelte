<script>
	import { getStores } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';

	const { url, session } = getStores(); // TODO note to self: getStores() appears to be masking a bug here

	let calls = 0;

	onMount(() => {
		session.set(calls);
	});

	const unsubscribe = url.subscribe(() => {
		calls++;
		session.set(calls);
	});

	onDestroy(unsubscribe);
</script>

<h1>Test</h1>
<h2>Calls: {calls}</h2>
<a href="/store/result">results</a>

{#if $url.pathname === '/store/result'}{console.log((window.oops = 'this should not happen'))}{/if}
