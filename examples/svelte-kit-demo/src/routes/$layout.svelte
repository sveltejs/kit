<script context="module">
	export const prerender = true;
</script>

<script>
	import Nav from '$components/Nav.svelte';
	export let segment;
</script>

<Nav {segment}/>

<main>
	<slot></slot>
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