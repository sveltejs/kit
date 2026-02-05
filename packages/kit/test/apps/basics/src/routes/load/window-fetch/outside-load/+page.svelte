<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let answer = 0;

	onMount(async () => {
		const res = await fetch(`${page.url.origin}/load/window-fetch/data.json`);
		({ answer } = await res.json());
	});
</script>

<h1>{answer}</h1>
