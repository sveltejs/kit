<script context="module">
	export const prerender = true;
</script>

<script>
	import { prerendering } from '$app/env';
	import { t } from '$app/translations';
</script>

<svelte:head>
	<title>{$t.about}</title>
</svelte:head>

<h1>{$t.about}</h1>
<p>this is the about page</p>
<p>prerendering: {prerendering}</p>
