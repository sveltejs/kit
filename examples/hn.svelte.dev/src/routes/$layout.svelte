<script context="module">
	export const prerender = true;
</script>

<script>
	import { getStores } from '/_app/main/runtime/stores';
	import Nav from '/_app/components/Nav.svelte';
	import PreloadingIndicator from '/_app/components/PreloadingIndicator.svelte';
	import ThemeToggler from '/_app/components/ThemeToggler.svelte';

	export let segment;

	const { preloading } = getStores();
</script>

<Nav {segment}/>

{#if $preloading}
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