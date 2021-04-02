<script context="module">
	export const prerender = true;
</script>

<script>
	import { prerendering } from '$app/env';
</script>

<svelte:head>
	<title>About</title>
</svelte:head>

<h1>about</h1>
<p>this is the about page</p>
<p>prerendering: {prerendering}</p>
