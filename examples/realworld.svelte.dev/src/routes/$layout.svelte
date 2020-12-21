<script>
	import { navigating } from '$app/stores';
	import Nav from '$components/Nav.svelte';
	import PreloadingIndicator from '$components/PreloadingIndicator.svelte';

	export let segment;
</script>

{#if $navigating}
	<PreloadingIndicator />
{/if}

<Nav {segment} />

<main>
	<slot />
</main>
