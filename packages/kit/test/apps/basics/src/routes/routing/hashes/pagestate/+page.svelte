<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	/** @type {string} */
	let hash;

	onMount(set_hash);

	function set_hash() {
		hash = window.location.hash;
	}
</script>

<svelte:window on:hashchange={set_hash} />

<h1 id="window-hash">{hash}</h1>
<h1 id="page-url-hash">{page.url.hash}</h1>

<a href="#target">Nav to hash</a>
<a href="/routing/hashes/pagestate">Nav to page</a>
<div id="target">Target</div>
