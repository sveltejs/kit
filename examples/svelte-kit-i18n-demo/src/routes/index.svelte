<script context="module">
	export const prerender = true;
</script>

<script>
	import { t } from '$app/translations';
	import { getContext } from 'svelte';

	const i18n = getContext('__svelte_i18n__');
	console.log($i18n);
	i18n.update(({ defaultLocale, ...i18n }) => i18n);
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<h1>Home</h1>

<h2>{$t.welcome('Philipp', 10)}</h2>

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
