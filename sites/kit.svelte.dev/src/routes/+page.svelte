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

	<Section --background="var(--sk-back-1)">
		<div class="grid" style="--columns: 3">
			<div>
				<h2>fast</h2>
				<p>
					Powered by <a href="https://svelte.dev">Svelte</a> and
					<a href="https://vitejs.dev">Vite</a>, speed is baked into every crevice: fast setup, fast
					dev, fast builds, fast page loads, fast navigation. Did we mention it's fast?
				</p>
			</div>

			<div>
				<h2>fun</h2>
				<p>
					No more wasted days figuring out bundler configuration, routing, SSR, CSP, TypeScript,
					deployment settings and all the other boring stuff. Code with joy.
				</p>
			</div>

			<div>
				<h2>flexible</h2>
				<p>
					SPA? MPA? SSR? SSG? Check. SvelteKit gives you the tools to succeed whatever it is you're
					building. And it runs wherever JavaScript does.
				</p>
			</div>
		</div>
	</Section>

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
