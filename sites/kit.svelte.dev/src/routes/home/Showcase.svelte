<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import monogram from './showcase/monogram.png';
	import raster from './showcase/raster.png';
	import trading_strategy from './showcase/trading-strategy.png';

	const showcase = [
		{ url: 'monogram.io', image: monogram },
		{ url: 'raster.app', image: raster },
		{ url: 'tradingstrategy.ai', image: trading_strategy }
	];
</script>

<Section
	--background="radial-gradient(circle at top right, rgb(230, 233, 236), rgb(244, 245, 247))"
>
	<h2>built with SvelteKit</h2>

	<div class="grid" style="--columns: 3">
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
		margin-bottom: 1em;
	}

	div.grid {
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
</style>
