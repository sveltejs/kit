<script>
	import { Footer, TrySection } from '@sveltejs/site-kit/home';
	import { onMount } from 'svelte';
	import Deployment from './home/Deployment.svelte';
	import Features from './home/Features.svelte';
	import Hero from './home/Hero.svelte';
	import Intro from './home/Intro.svelte';
	import Showcase from './home/Showcase.svelte';
	import Svelte from './home/Svelte.svelte';
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
	<TrySection />
	<Svelte />
	<Features />
	<Deployment />
	<Showcase />

	<Footer
		links={{
			resources: [
				{
					title: 'documentation',
					href: '/docs'
				},
				{
					title: 'tutorial',
					href: 'https://learn.svelte.dev/tutorial/introducing-sveltekit'
				},
				{
					title: 'blog',
					href: 'https://svelte.dev/blog'
				}
			],
			connect: [
				{
					title: 'github',
					href: 'https://github.com/sveltejs/kit'
				},
				{
					title: 'opencollective',
					href: 'https://opencollective.com/svelte'
				},
				{
					title: 'discord',
					href: 'https://svelte.dev/chat'
				},
				{
					title: 'twitter',
					href: 'https://twitter.com/sveltejs'
				}
			]
		}}
	>
		<span slot="license">
			SvelteKit is <a target="_blank" rel="noreferrer" href="https://github.com/sveltejs/kit"
				>free and open source software</a
			> released under the MIT license.
		</span></Footer
	>
</div>
