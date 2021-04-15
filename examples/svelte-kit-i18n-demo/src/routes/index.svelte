<script context="module">
	export const prerender = true;
</script>

<script>
	import { t } from '$app/translations';
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<h1>Home</h1>

<h2>{$t.welcome('User', 1)}</h2>

<p>This is an example of using Vite for SSR.</p>

<img alt="Svelte logo" src="/logo.svg" />

<style>
	h1 {
		font-size: 48px;
	}

	img {
		width: 200px;
	}
</style>
