<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import Features from './home/Features.svelte';
	import Hero from './home/Hero.svelte';
	import Showcase from './home/Showcase.svelte';
	import Try from './home/Try.svelte';
	import Video from './home/Video.svelte';
	import './home/common.css';
	import Deployment from './home/Deployment.svelte';
	import Svelte from './home/Svelte.svelte';
	import Intro from './home/Intro.svelte';
</script>

<svelte:head>
	<title>SvelteKit • Web development, streamlined</title>

	<meta name="twitter:title" content="SvelteKit" />
	<meta name="twitter:description" content="Web development, streamlined" />
	<meta name="description" content="SvelteKit is the official Svelte application framework" />
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
		<p>SvelteKit is free and open source software released under the MIT license.</p>
	</footer>
</div>

<style>
	footer {
		padding: 1em var(--sk-page-padding-side);
		text-align: center;
	}

	footer p {
		max-width: 20em;
		margin: 0 auto;
	}

	@media (min-width: 680px) {
		footer p {
			max-width: none;
		}
	}
</style>
