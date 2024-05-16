<script>
	import { base } from '$app/paths';
	import Logotype from './svelte-kit-logotype.svg.svelte';
</script>

<section class="hero">
	<div class="hero-contents">
		<div class="hero-text">
			<div class="logotype" role="img" aria-label="SvelteKit">
				<Logotype />
			</div>

			<div class="tagline">web development, streamlined</div>
			<a href="{base}/docs/introduction" class="cta"> read the docs </a>
		</div>

		<div class="hero-image-wrapper">
			<enhanced:img
				src="./svelte-kit-machine.webp?w=1440;1080;768;640"
				sizes="(min-width: 768px) min(100vw, 108rem), 64rem"
				class="hero-image"
				alt="SvelteKit illustration"
			/>
		</div>
	</div>
</section>

<style>
	.hero {
		--gradient: radial-gradient(
				83.39% 117.39% at 47.58% 31.75%,
				rgba(242, 249, 255, 0.52) 0%,
				rgba(255, 255, 255, 0) 100%
			),
			linear-gradient(
				125deg,
				#e7f1fa 0%,
				rgba(238, 247, 255, 0.48) 34.51%,
				rgba(222, 234, 244, 0.62) 100%
			);

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
		background-blend-mode: hard-light, multiply, normal;
		position: relative;
		padding: 8rem var(--sk-page-padding-side);
		margin-bottom: 2rem;
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

	.hero-image-wrapper {
		--size: 64rem;
		position: absolute;
		left: calc(50% - 0.53 * var(--size));
		bottom: -30rem;
		pointer-events: none;
	}

	.hero-image {
		width: var(--size);
		height: auto;
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.cta {
		display: inline-block;
		align-items: center;
		gap: 0.1rem;
		background: var(--sk-theme-1);
		padding: 0.35em 0.8em;
		width: max-content;
		margin-top: 1.6rem;
		font-size: var(--sk-text-s);
		letter-spacing: 0.05em;
		font-weight: 600;
		white-space: nowrap;
		border-radius: var(--sk-border-radius);
		box-shadow: 0px 6px 14px rgba(0, 0, 0, 0.08);
		color: #fff;
		color: color-mix(in hwb, hsl(var(--sk-theme-1-hsl)) 10%, var(--sk-back-1) 95%);
		transition: 0.5s var(--quint-out);
		transition-property: box-shadow, color;
	}

	.cta:hover {
		text-decoration: none;
		box-shadow:
			0px 0.8px 3.8px rgba(0, 0, 0, 0.115),
			0px 6px 30px rgba(0, 0, 0, 0.23);
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

		.hero-image-wrapper {
			--size: min(100vw, 108rem);
			left: auto;
			right: -20rem;
			bottom: calc(-5rem - 0.38 * var(--size));
		}

		.cta {
			font-size: var(--sk-text-m);
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
