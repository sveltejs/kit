<script>
	import { page, navigating } from '$app/stores';
	import Nav from '$lib/Nav.svelte';
	import PreloadingIndicator from '$lib/PreloadingIndicator.svelte';
	import ThemeToggler from '$lib/ThemeToggler.svelte';
	import '../app.css';


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