<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import monogram from './showcase/monogram.png';
	import raster from './showcase/raster.png';
	import trading_strategy from './showcase/trading-strategy.png';

	const showcase = [
		{ url: 'monogram.io', image: monogram },
		{ url: 'raster.app', image: raster },
		{ url: 'trading-strategy.ai', image: trading_strategy }
	];
</script>

<Section
	--background="radial-gradient(circle at top right, rgb(230, 233, 236), rgb(244, 245, 247))"
>
	<h2>built with SvelteKit</h2>

	<div class="grid" style="--columns: 3">
		{#each showcase as { url, image }}
			<a class="drop-shadow" href="https://{url}">
				<img src={image} alt="Screenshot of {url}" />
				<span>{url}</span>
			</a>
		{/each}
	</div>
</Section>

<style>
	div.grid {
		/* column-gap: 6rem; */
		row-gap: 0rem;
	}

	a {
		overflow: hidden;
		margin: 1em 0;
	}

	img {
		border-radius: var(--sk-border-radius);
		width: 100%;
		margin: 0 0 0.5em 0;
	}

	a {
		color: var(--sk-text);
	}
</style>
