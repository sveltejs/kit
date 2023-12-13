<script>
	import { Section } from '@sveltejs/site-kit/components';
	import pudding from './showcase/pudding.png?enhanced';
	import pocketbase from './showcase/pocketbase.png?enhanced';
	import pronauns from './showcase/pronauns.png?enhanced';
	import pausly from './showcase/pausly.png?enhanced';
	import asmeditor from './showcase/asmeditor.png?enhanced';
	import monogram from './showcase/monogram.png?enhanced';
	import raster from './showcase/raster.png?enhanced';
	import tradingstrategy from './showcase/tradingstrategy.png?enhanced';

	const showcase = [
		{ url: 'pudding.cool', image: pudding },
		{ url: 'www.pronauns.com', image: pronauns },
		{ url: 'www.pausly.app', image: pausly },
		{ url: 'asm-editor.specy.app', image: asmeditor },
		{ url: 'raster.app', image: raster },
		{ url: 'pocketbase.io', image: pocketbase },
		{ url: 'monogram.io', image: monogram },
		{ url: 'tradingstrategy.ai', image: tradingstrategy }
	];
</script>

<Section --background="var(--background-2)">
	<h2>showcase</h2>

	<div class="showcase">
		{#each showcase as { url, image }}
			<a href="https://{url}" target="_blank" rel="noreferrer">
				<enhanced:img src={image} alt="" style="width:100%; height:100%; object-fit:cover" />
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
		color: var(--sk-text-1);
		display: flex;
		border-radius: var(--sk-border-radius);
		overflow: hidden;
		aspect-ratio: 16 / 9;
	}

	a :global(img) {
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
		font-size: var(--sk-text-s);
		filter: drop-shadow(0 0 0.5rem rgba(0, 0, 0, 0.5));
	}

	a:hover span {
		opacity: 1;
	}

	a:hover :global(img) {
		transform: scale(1.05);
	}

	@media (min-width: 400px) {
		.showcase {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 800px) {
		.showcase {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
