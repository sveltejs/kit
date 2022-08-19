<script>
	import createGlobe from 'cobe';
	import { onMount } from 'svelte';
	import Grow from './grow.png';

	let canvas;
	let phi = 0;

	onMount(() => {
		const globe = createGlobe(canvas, {
			devicePixelRatio: 2,
			width: 1000 * 2,
			height: 1000 * 2,
			phi: 0,
			theta: 0,
			dark: 1,
			diffuse: 1.2,
			mapSamples: 16000,
			mapBrightness: 6,
			baseColor: [0.3, 0.3, 0.3],
			markerColor: [0.1, 0.8, 1],
			glowColor: [1, 1, 1],
			offset: [0, 2000],
			markers: [
				// https://vercel.com/docs/concepts/edge-network/regions
				{ location: [59.3293, 18.0686], size: 0.1 }, // Stockholm
				{ location: [19.0760, 72.8777], size: 0.1 }, // Mumbai
				{ location: [48.8566, 2.3522], size: 0.1 }, // Paris
				{ location: [41.4993, -81.6944], size: 0.1 }, // Cleveland
				{ location: [-33.9249, 18.4241], size: 0.1 }, // Cape Town
				{ location: [53.3498, -6.2603], size: 0.1 }, // Dublin
				{ location: [50.1109, 8.6821], size: 0.1 }, // Frankfurt
				{ location: [-23.5558, -46.6396], size: 0.1 }, // São Paulo
				{ location: [22.3193, 114.1694], size: 0.1 }, // Hong Kong
				{ location: [35.6762, 139.6503], size: 0.1 }, // Tokyo
				{ location: [38.9072, -77.0369], size: 0.1 }, // DC
				{ location: [37.5665, 126.9780], size: 0.1 }, // Seoul
				{ location: [34.6937, 135.5023], size: 0.1 }, // Osaka
				{ location: [51.5072, -0.1276], size: 0.1 }, // London
				{ location: [45.5152, -122.6784], size: 0.1 }, // Portland
				{ location: [37.7595, -122.4367], size: 0.1 }, // SF
				{ location: [1.3521, 103.8198], size: 0.1 }, // Singapore
				{ location: [-33.8688, 151.2093], size: 0.1 } // Sydney
			],
			onRender: state => {
				state.phi = phi;
				phi += 0.008;
			}
		});
	});
</script>

<h3>SvelteKit grows with you,<br/><span style="font-weight:bold">whatever</span> you're building</h3>

<img src={Grow} alt="Build SSGs, MPAs, PWAs, or SPAs." />

<canvas bind:this={canvas} style="width: 1000px; height: 500px;" />

<style>
	h3 {
		margin-bottom: 3rem;
	}

	img {
		width: 100%;
		height: auto;
	}
</style>
