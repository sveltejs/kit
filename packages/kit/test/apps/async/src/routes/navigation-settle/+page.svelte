<script>
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		window.after_navigate_log = [];
	});

	// register a function to run once each navigation has completed
	onNavigate((navigation) => {
		return () => window.after_navigate_log.push(navigation.to?.url.pathname ?? '');
	});
</script>

<a href="/navigation-settle/held">held</a>
<a href="/navigation-settle/other">other</a>
