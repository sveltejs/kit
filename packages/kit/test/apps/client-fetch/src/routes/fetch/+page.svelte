<script>
	import { onMount } from 'svelte';

	let header = $state('loading');

	onMount(async () => {
		const res = await fetch('/api');
		const data = await res.json();
		header = data.header;
	});
</script>

<div data-testid="header">{header}</div>
