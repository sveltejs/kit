<script>
	import { onMount } from 'svelte';
	import Features from './home/Features.svelte';
	import Hero from './home/Hero.svelte';
	import Showcase from './home/Showcase.svelte';
	import Try from './home/Try.svelte';
	import Deployment from './home/Deployment.svelte';
	import Svelte from './home/Svelte.svelte';
	import Intro from './home/Intro.svelte';
	import schema_url from './schema.json?url';
	import './home/common.css';

	let schema;
	onMount(async () => {
		// Google will not allow linking to a schema file. It must be in the DOM
		// We load it and add it to the DOM to save bytes on page load vs inlining
		const json = await (await fetch(schema_url)).text();
		schema = `<script type="application/ld+json">${json}<\/script>`;
	});
</script>

<svelte:head>
	<title>SvelteKit • Web development, streamlined</title>

	<meta name="twitter:title" content="SvelteKit" />
	<meta name="twitter:description" content="Web development, streamlined" />
	<meta name="description" content="SvelteKit is the official Svelte application framework" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="SvelteKit • Web development, streamlined" />
	<meta
		property="og:description"
		content="SvelteKit is the official Svelte application framework"
	/>
	<meta property="og:url" content="https://kit.svelte.dev/" />
	<meta
		property="og:image"
		content="https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg"
	/>

	{#if schema}
		{@html schema}
	{/if}
</svelte:head>

<div class="home">
	<h1 class="visually-hidden">SvelteKit</h1>

	<Hero />
	<Intro />
	<Try />
	<Svelte />
	<Features />
	<Deployment />
	<Showcase />

	<footer>
		<p>
			SvelteKit is <a target="_blank" rel="noreferrer" href="https://github.com/sveltejs/kit"
				>free and open source software</a
			> released under the MIT license.
		</p>
	</footer>
</div>

<style>
	footer {
		padding: 1em var(--sk-page-padding-side);
		text-align: center;
		background: var(--sk-back-2);
	}

	footer p {
		max-width: 20em;
		margin: 0 auto;
	}

	footer p a {
		color: inherit;
		text-decoration: underline;
	}

	@media (min-width: 680px) {
		footer p {
			max-width: none;
		}
	}
</style>
