<script>
	import SvelteLogo from '$lib/SvelteLogo.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	let n = 0;
</script>

<SvelteLogo />

<p data-source="base">{data.paths.base}</p>
<p data-source="assets">{data.paths.assets}</p>

<button on:click={() => (n += 1)}>clicks: {n}</button>

{#if n === 1}
	<h2>button has been clicked 1 time</h2>
{/if}

<style>
	p {
		color: red;
	}
</style>
