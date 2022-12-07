<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import pudding from './showcase/pudding.jpg';
	import evidence from './showcase/evidence.jpg';
	import fieuzal from './showcase/fieuzal.jpg';
	import gitbook from './showcase/gitbook.jpg';
	import monogram from './showcase/monogram.jpg';
	import raster from './showcase/raster.jpg';
	import trading_strategy from './showcase/trading-strategy.jpg';
	import senja from './showcase/senja.jpg';

	const showcase = [
		{ url: 'pudding.cool', image: pudding },
		{ url: 'fieuzal.com', image: fieuzal },
		{ url: 'evidence.dev', image: evidence },
		{ url: 'gitbook.com', image: gitbook },
		{ url: 'raster.app', image: raster },
		{ url: 'monogram.io', image: monogram },
		{ url: 'tradingstrategy.ai', image: trading_strategy },
		{ url: 'senja.io', image: senja }
	];
</script>

<Section --background="var(--background-2)">
	<h2>showcase</h2>

	<div class="showcase">
		{#each showcase as { url, image }}
			<a class="drop-shadow" href="https://{url}" target="_blank" rel="noreferrer">
				<img src={image} alt="Screenshot of {url}" />
				<span>{url}</span>
			</a>
		{/each}
	</div>
</Section>

<style>
	h2 {
		color: white;
		margin-bottom: 1em;
		text-transform: uppercase;
		font-size: var(--sk-text-s);
		text-align: center;
	}

	.showcase {
		display: grid;
		gap: 2rem;
	}

	a {
		overflow: hidden;
		color: var(--sk-text);
		display: flex;
		border-radius: var(--sk-border-radius);
		overflow: hidden;
		aspect-ratio: 16 / 9;
	}

	img {
		width: 100%;
		height: 100%;
		margin: 0 0 0.5em 0;
		object-fit: cover;
		display: block;
		transition: transform 0.2s;
	}

	span {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		left: 0;
		top: 0;
		background: rgba(0, 0, 0, 0.25);
		color: white;
		backdrop-filter: blur(3px);
		opacity: 0;
		transition: opacity 0.2s;
		font-size: var(--sk-text-m);
		filter: drop-shadow(0 0 0.5rem rgba(0, 0, 0, 0.5));
	}

	a:hover span {
		opacity: 1;
	}

	a:hover img {
		transform: scale(1.05);
	}

	@media (min-width: 400px) {
		.showcase {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 720px) {
		.showcase {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
