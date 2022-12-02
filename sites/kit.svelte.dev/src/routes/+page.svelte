<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import Features from './Features.svelte';
	import Hero from './Hero.svelte';
	import Try from './Try.svelte';
	import Video from './Video.svelte';
</script>

<svelte:head>
	<title>SvelteKit • The fastest way to build Svelte apps</title>

	<meta name="twitter:title" content="SvelteKit" />
	<meta name="twitter:description" content="The fastest way to build Svelte apps" />
	<meta name="description" content="SvelteKit is the official Svelte application framework" />
</svelte:head>

<h1 class="visually-hidden">SvelteKit</h1>
<Hero />

<Section>
	<div class="grid" style="--columns: 3">
		<div>
			<h2>fast</h2>
			<p>
				Powered by <a href="https://svelte.dev">Svelte</a> and
				<a href="https://vitejs.dev">Vite</a>, speed is baked into every aspect of SvelteKit's
				design: fast installation, fast development, fast builds, fast page loads, fast navigations.
				Did we mention it's fast?
			</p>
		</div>

		<div>
			<h2>fun</h2>
			<p>
				No more wasted days figuring out bundler configuration and routing and server-side rendering
				and progressive enhancement and CSP and environment variables and all the other boring
				stuff. Code with joy.
			</p>
		</div>

		<div>
			<h2>flexible</h2>
			<p>
				SPA? MPA? SSR? SSG? WTF. SvelteKit doesn't force its opinions on you, but instead gives you
				the tools to succeed whatever it is you're building. And it runs wherever JavaScript does.
			</p>
		</div>
	</div>
</Section>

<Try />

<Section
	--background="radial-gradient(circle at top right, rgb(230, 233, 236), rgb(244, 245, 247))"
>
	<!-- <h2>svelte</h2> -->
	<p class="definition">
		<span>adjective</span> <em>/svelt/</em> attractively thin, graceful and stylish
	</p>

	<div class="grid" style="--columns: 3">
		<div>
			<p>
				SvelteKit is built on Svelte, a different kind of UI framework. It uses a compiler to let
				you write breathtakingly concise components that do minimal work in the browser, using
				languages you already know — HTML, CSS and JavaScript. <strong
					style="color: var(--sk-theme-2)">It's a love letter to web development.</strong
				>
			</p>

			<p>
				But don't take our word for it. Developers consistently rank Svelte as the framework they're
				<a
					href="https://insights.stackoverflow.com/survey/2021#section-most-loved-dreaded-and-wanted-web-frameworks"
					>most</a
				>
				<a
					href="https://tsh.io/state-of-frontend/#which-of-the-following-frameworks-would-you-like-to-learn-in-the-future"
					>excited</a
				> <a href="https://2021.stateofjs.com/en-US/libraries/front-end-frameworks/">about</a>
				<a href="https://twitter.com/Rich_Harris/status/1589675637195042817">using</a>.
			</p>

			<p>
				Watch <a href="https://www.youtube.com/watch?v=kMlkCYL9qo0">Svelte Origins</a>
				on YouTube.
			</p>
		</div>

		<div class="video-container">
			<Video />
		</div>
	</div>
</Section>

<Features />

<Section --background="radial-gradient(circle at 40% 30%, rgb(110, 113, 118), rgb(81, 93, 106))">
	<h2 style="color: white">TODO showcase/testimonials</h2>
</Section>

<style>
	:global(.hero-container:dir(rtl)) {
		max-width: 116rem;
	}

	.grid {
		display: grid;
		gap: 1em;
		margin: 0 0 6rem 0;
	}

	.grid:last-child {
		margin-bottom: 0;
	}

	h2 {
		font-size: 2.8rem;
	}

	h2:not(.grid h2) {
		text-align: center;
	}

	.definition {
		font-size: var(--sk-text-l);
	}

	.definition span {
		text-transform: uppercase;
		font-size: var(--sk-text-s);
		color: var(--sk-text-3);
	}

	.definition em {
		font-style: italic;
		font-weight: 600;
		color: var(--sk-theme-1);
	}

	@media (min-width: 900px) {
		h2 {
			font-size: 4rem;
		}

		.grid {
			grid-template-columns: repeat(var(--columns), 1fr);
			gap: 7rem;
		}

		.video-container {
			grid-column: 2 / 4;
		}
	}
</style>
