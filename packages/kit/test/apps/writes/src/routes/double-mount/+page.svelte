<script context="module">
	import { browser } from '$app/environment';

	if (browser) {
		window.mounted = window.mounted || 0;
	}
</script>

<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let mounted = 0;

	onMount(() => {
		mounted = window.mounted += 1;
	});
</script>

<h1>mounted: {browser ? mounted : 0}</h1>
<button on:click={() => goto('/double-mount')}>click me</button>
<span hidden>PLACEHOLDER:0</span>
