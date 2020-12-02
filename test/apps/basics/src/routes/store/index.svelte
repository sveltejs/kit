<script>
	import { getStores } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';

	const { page, session } = getStores();

	let call_count = 0;

	onMount(() => {
		session.set(call_count);
	});

	const unsubscribe = page.subscribe($page => {
		call_count++;
		session.set(call_count);
	});

	onDestroy(unsubscribe);

	const throw_error = () => {
		throw new Error('This should not happen');
	}
</script>

<h1>Test</h1>
<h2>Called {call_count} time</h2>
<a href="result">results</a>

{#if $page.path === '/store/result'}
	{console.log(window.oops = 'this should not happen')}
{/if}