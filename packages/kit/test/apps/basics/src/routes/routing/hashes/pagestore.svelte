<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	/** @type {string} */
	let curWindowHash;
	onMount(() => setHashVar());
	function setHashVar() {
		curWindowHash = window.location.hash;
	}
</script>

<svelte:window on:hashchange={setHashVar} />

<h1 id="window-hash">{curWindowHash}</h1>
<h1 id="page-url-hash">{$page.url.hash}</h1>

<a href="#target">Nav to #ing with anchor tag</a>
<div id="target">Target</div>
