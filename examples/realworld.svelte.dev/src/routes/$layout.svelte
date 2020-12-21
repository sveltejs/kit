<script>
	import { navigating } from '$app/stores';
	import Nav from '$components/Nav.svelte';
	import PreloadingIndicator from '$components/PreloadingIndicator.svelte';
</script>

{#if $navigating}
	<PreloadingIndicator />
{/if}

<Nav />

<main>
	<slot />
</main>
