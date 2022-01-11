<script context="module">
	import { base, assets } from '$app/paths';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			props: {
				data: {
					base,
					assets
				}
			}
		};
	}
</script>

<script>
	import SvelteLogo from '$lib/SvelteLogo.svelte';

	/** @type {any} */
	export let data;

	let n = 0;
</script>

<SvelteLogo />

<p data-source="base">{data.base}</p>
<p data-source="assets">{data.assets}</p>

<button on:click={() => n += 1}>clicks: {n}</button>

{#if n === 1}
	<h2>button has been clicked 1 time</h2>
{/if}

<style>
	p {
		color: red;
	}
</style>
