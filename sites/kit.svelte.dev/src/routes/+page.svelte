<script>
	import { Blurb } from '@sveltejs/site-kit';
	import Hero from './Hero.svelte';
	import Logotype from './svelte-kit-logotype.svg';
	import Machine from './svelte-kit-machine.webp?w=1440;800;600;480&format=avif;webp;png&picture';
</script>

<svelte:head>
	<title>SvelteKit • The fastest way to build Svelte apps</title>

	<meta name="twitter:title" content="SvelteKit" />
	<meta name="twitter:description" content="The fastest way to build Svelte apps" />
	<meta name="description" content="SvelteKit is the official Svelte application framework" />
</svelte:head>

<h1 class="visually-hidden">SvelteKit</h1>
<Hero
	title="SvelteKit"
	logotype={Logotype}
	tagline="The fastest way to build svelte apps"
	background={Machine}
	alt="SvelteKit illustration"
/>

<div class="blurb-shifter">
	<Blurb>
		<div slot="one">
			<h2>Powered by Svelte</h2>
			<p>
				SvelteKit is an application framework powered by Svelte — build bigger apps with a smaller
				footprint
			</p>

			<a href="https://svelte.dev" class="cta">learn Svelte</a>
		</div>

		<div slot="two">
			<h2>Best of both worlds</h2>
			<p>
				All the SEO and progressive enhancement of a server-rendered app, with the slick navigation
				of an SPA
			</p>

			<a data-sveltekit-preload href="/docs" class="cta">read the docs</a>
		</div>

		<div slot="three">
			<h2>Build fast</h2>
			<p>
				Hit the ground running with advanced routing, server-side rendering, code-splitting, offline
				support and more
			</p>

			<a data-sveltekit-preload href="/docs" class="cta">read the docs</a>
		</div>

		<div class="description" slot="what">
			<p>
				SvelteKit is a framework for building web applications of all sizes, with a beautiful
				development experience and flexible filesystem-based routing.
			</p>

			<p>
				Unlike single-page apps, SvelteKit doesn't compromise on SEO, progressive enhancement or the
				initial load experience — but unlike traditional server-rendered apps, navigation is
				instantaneous for that app-like feel.
			</p>

			<p>
				<a href="https://node.new/sveltekit">Try it on StackBlitz</a> or create a project locally.
			</p>
		</div>

		<div slot="how">
			<pre><code
					>npm create <span class="orange-highlight">svelte</span>@latest my-app
cd my-app
npm install
npm run dev -- --open</code
				></pre>
			<a data-sveltekit-preload href="/docs" class="cta">get started</a>
		</div>
	</Blurb>
</div>

<style>
	:global(.hero-container:dir(rtl)) {
		max-width: 116rem;
	}

	pre {
		height: 100%;
		display: flex;
		flex-direction: column;
		color: var(--second-text);
	}

	.orange-highlight {
		color: var(--prime);
	}

	.blurb-shifter {
		margin-top: calc(-10rem + var(--side-nav));
	}

	@media (min-width: 900px) {
		.blurb-shifter {
			margin-top: -12em;
		}
	}
</style>
