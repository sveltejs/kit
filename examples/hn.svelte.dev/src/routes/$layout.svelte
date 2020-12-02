<script context="module">
	export const prerender = true;
</script>

<script>
	import { page, navigating } from '$app/stores';
	import Nav from '$components/Nav.svelte';
	import PreloadingIndicator from '$components/PreloadingIndicator.svelte';
	import ThemeToggler from '$components/ThemeToggler.svelte';

	$: section = $page.path.split('/')[1];
</script>

<Nav {section}/>

{#if $navigating}
	<PreloadingIndicator/>
{/if}

<main>
	<slot></slot>
</main>

<ThemeToggler/>

<style>
	main {
		position: relative;
		max-width: 56em;
		padding: 2em;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>