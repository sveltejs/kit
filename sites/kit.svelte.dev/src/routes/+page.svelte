<script>
	import Features from './home/Features.svelte';
	import Hero from './home/Hero.svelte';
	import Showcase from './home/Showcase.svelte';
	import Try from './home/Try.svelte';
	import Deployment from './home/Deployment.svelte';
	import Svelte from './home/Svelte.svelte';
	import Intro from './home/Intro.svelte';
	import './home/common.css';
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
