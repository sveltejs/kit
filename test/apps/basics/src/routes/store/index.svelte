<script>
	import { getStores } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';

	const { page, session } = getStores();

	let calls = 0;

	onMount(() => {
		session.set(calls);
	});

	const unsubscribe = page.subscribe($page => {
		calls++;
		session.set(calls);
	});

	onDestroy(unsubscribe);
</script>

<h1>Test</h1>
<h2>Calls: {calls}</h2>
<a href="/store/result">results</a>

{#if $page.path === '/store/result'}
	{console.log(window.oops = 'this should not happen')}
{/if}