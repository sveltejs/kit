<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import Features from './home/Features.svelte';
	import Hero from './home/Hero.svelte';
	import Showcase from './home/Showcase.svelte';
	import Try from './home/Try.svelte';
	import Video from './home/Video.svelte';
	import './home/common.css';
	import Deployment from './home/Deployment.svelte';
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

	<Section --background="var(--background-1)">
		<p class="definition">
			<em>/ˈsvɛlt/</em> <span class="adjective">adjective</span>
			<span class="description">attractively thin, graceful and stylish</span>
		</p>

		<div class="grid" style="--columns: 3">
			<div class="video-container">
				<Video />

				<p>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://www.offerzen.com/community/svelte-origins-documentary"
					>
						Watch the full Svelte Origins documentary
					</a>
				</p>
			</div>

			<div>
				<p>
					SvelteKit is built on Svelte, a different kind of UI framework. It uses a compiler to let
					you write breathtakingly concise components that do minimal work in the browser, using
					languages you already know — HTML, CSS and JavaScript. <strong
						style="color: var(--sk-theme-2)">It's a love letter to web development.</strong
					>
				</p>

				<p>
					But don't take our word for it. Developers consistently rank Svelte as the framework
					they're
					<a
						target="_blank"
						rel="noreferrer"
						href="https://insights.stackoverflow.com/survey/2021#section-most-loved-dreaded-and-wanted-web-frameworks"
					>
						most
					</a>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://tsh.io/state-of-frontend/#which-of-the-following-frameworks-would-you-like-to-learn-in-the-future"
					>
						excited
					</a>
					<a
						target="_blank"
						rel="noreferrer"
						href="https://2021.stateofjs.com/en-US/libraries/front-end-frameworks/"
					>
						about
					</a>

					<a
						target="_blank"
						rel="noreferrer"
						href="https://twitter.com/Rich_Harris/status/1589675637195042817"
					>
						using</a
					>.
				</p>
			</div>
		</div>
	</Section>

	<Features />

	<Deployment />

	<Showcase />

	<footer>
		<p>SvelteKit is free and open source software released under the MIT license.</p>
	</footer>
</div>

<style>
	.definition {
		font-size: var(--sk-text-l);
	}

	.definition em {
		font-style: normal;
		font-size: var(--sk-text-xxl);
		color: var(--sk-theme-1);
	}

	.definition .adjective {
		position: relative;
		top: -0.2em;
		background: var(--sk-theme-3);
		padding: 0.2em 0.5em;
		margin: 0 1em;
		text-transform: uppercase;
		font-size: var(--sk-text-s);
		color: white;
	}

	.definition .description {
		display: block;
	}

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

	@media (min-width: 900px) {
		.definition .description {
			display: inline;
		}

		.home .video-container {
			order: 2;
			grid-column: 2 / 4;
		}
	}
</style>
