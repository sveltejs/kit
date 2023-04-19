<script>
	import { base } from '$app/paths';
	import Logotype from './svelte-kit-logotype.svg.svelte';
	import background from './svelte-kit-machine.webp?w=1440;960&format=avif;webp;png&picture';
</script>

<section class="hero">
	<div class="hero-contents">
		<div class="hero-text">
			<div class="logotype" role="img" aria-label="SvelteKit">
				<Logotype />
			</div>

			<div class="tagline">web development, streamlined</div>
			<a class="cta" href="{base}/docs/introduction">read the docs</a>
		</div>

		<picture class="hero-image">
			{#each Object.entries(background.sources) as [format, images]}
				<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type="image/{format}" />
			{/each}
			<img src={background.fallback.src} alt="SvelteKit illustration" />
		</picture>
	</div>
</section>

<style>
	.hero {
		--gradient: radial-gradient(
				34.14% 72.25% at 47.58% 31.75%,
				hsla(209, 100%, 95%, 0.52) 0%,
				hsla(0, 0%, 100%, 0) 100%
			),
			linear-gradient(
				92.4deg,
				hsl(210, 7%, 83%) 14.67%,
				hsla(208, 100%, 97%, 0.48) 54.37%,
				hsla(207, 22%, 84%, 0.62) 92.49%
			),
			linear-gradient(0deg, hsl(204, 38%, 90%), hsl(204, 38%, 90%));
		--dark-gradient: radial-gradient(
				64.14% 72.25% at 47.58% 31.75%,
				hsl(209deg 6% 47% / 52%) 0%,
				hsla(0, 0%, 100%, 0) 100%
			),
			linear-gradient(
				92.4deg,
				hsl(210, 7%, 16%) 14.67%,
				hsl(0deg 0% 0% / 48%) 54.37%,
				hsla(207, 22%, 13%, 0.62) 92.49%
			),
			linear-gradient(0deg, hsl(204, 38%, 20%), hsl(204, 10%, 90%));
		max-width: 100vw;
		background: hsl(210, 7%, 84%);
		background: var(--gradient);
		position: relative;
		padding: 8rem var(--sk-page-padding-side);
	}

	.hero-contents {
		position: relative;
		max-width: 48rem;
		margin: 0 auto;
		padding-bottom: 10rem;
	}

	.hero-text {
		text-align: center;
	}

	.hero .tagline {
		font-size: var(--sk-text-l);
		font-weight: 200;
		line-height: 1.2;
		color: var(--sk-text-2);
		font-family: var(--sk-font);
		max-width: 12em;
		margin: 0 auto;
	}

	.logotype :global(svg) {
		position: relative;
		width: 100%;
		max-width: 400px;
		margin: 0 0 1rem 0;
	}

	.hero-image {
		--size: 64rem;
		position: absolute;
		left: calc(50% - 0.53 * var(--size));
		bottom: -28rem;
		pointer-events: none;
	}

	.hero-image img {
		width: var(--size);
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.cta {
		display: inline-block;
		background: var(--sk-theme-1);
		padding: 0.5em 1em;
		font-size: var(--sk-text-m);
		border-radius: var(--sk-border-radius);
		color: white;
		margin: 1em 0;
	}

	@media (min-width: 400px) {
		.hero .tagline {
			max-width: none;
		}
	}

	@media (min-width: 768px) {
		.hero {
			padding: calc(10rem + var(--sk-nav-height)) var(--sk-page-padding-side) 16rem;
		}
		.hero-contents {
			max-width: calc(120rem - 2 * var(--sk-page-padding-side));
			padding-bottom: 0rem;
		}

		.hero-text {
			text-align: left;
		}

		.hero-image {
			--size: min(100vw, 108rem);
			left: auto;
			right: -20rem;
			bottom: calc(-5rem - 0.38 * var(--size));
		}
	}

	@media (prefers-color-scheme: dark) {
		.hero {
			background: hsl(210, 7%, 20%);
			background: var(--dark-gradient);
		}

		.hero-text :global(svg) {
			mix-blend-mode: screen;
		}

		:global(body.light) .hero {
			background: var(--gradient);
		}

		:global(body.light) .hero-text :global(svg) {
			mix-blend-mode: initial;
		}
	}

	:global(body.dark) .hero {
		background: hsl(210, 7%, 20%);
		background: var(--dark-gradient);
	}

	:global(body.dark) .hero-text :global(svg) {
		mix-blend-mode: screen;
	}
</style>
