<script context="module">
	export const prerender = true;
</script>

<script>
	import Nav from '$lib/Nav.svelte';
</script>

<Nav />

<main>
	<slot />
</main>

<style>
	:root {
		font-family: sans-serif;
	}

	main {
		max-width: 40em;
		margin: 0 auto;
	}
</style>
