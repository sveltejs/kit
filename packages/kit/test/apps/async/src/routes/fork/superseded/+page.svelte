<script>
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		window.held_navigations = [];
	});

	// hold every navigation until the test releases it, as a view transition would
	onNavigate(() => {
		return new Promise((fulfil) => {
			window.held_navigations.push(fulfil);
		});
	});
</script>

<a href="/fork/superseded/preloaded">preloaded</a>
<a href="/fork/superseded/other">other</a>
