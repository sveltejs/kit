<script context="module">
	export function load() {
		return {
			cache: { maxage: 60 }
		};
	}
</script>

<script>
	import Machine from '$img/svelte-kit-machine.webp?w=1440;800&format=avif;webp;png&meta';
	import { Hero, Blurb } from '@sveltejs/site-kit';
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
	logotype="images/svelte-kit-logotype.svg"
	tagline="The fastest way to build svelte apps"
	background={Machine}
	alt="SvelteKit illustration"
	width={800}
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

			<a sveltekit:prefetch href="/docs" class="cta">read the docs</a>
		</div>

		<div slot="three">
			<h2>Build fast</h2>
			<p>
				Hit the ground running with advanced routing, server-side rendering, code-splitting, offline
				support and more
			</p>

			<a sveltekit:prefetch href="/docs" class="cta">read the docs</a>
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
				Read the <a href="https://svelte.dev/blog/whats-the-deal-with-sveltekit" class="cta"
					>introductory blog</a
				>
				post to learn more.
			</p>
		</div>

		<div slot="how">
			<pre><code>
npm init <span class="orange-highlight">svelte</span> my-app
cd my-app
npm install
npm run dev -- --open
</code></pre>
			<a sveltekit:prefetch href="/docs" class="cta">get started</a>
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
