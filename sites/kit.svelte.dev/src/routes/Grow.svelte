<script>
	import createGlobe from 'cobe';
	import { onMount } from 'svelte';

	import Grow from './grow.svg';

	let canvas;
	let phi = 0;

	// onMount(() => {
	// 	const globe = createGlobe(canvas, {
	// 		devicePixelRatio: 2,
	// 		width: 1000 * 2,
	// 		height: 1000 * 2,
	// 		phi: 0,
	// 		theta: 0,
	// 		dark: 0.1,
	// 		diffuse: 0.6,
	// 		mapSamples: 16000,
	// 		mapBrightness: 4,
	// 		baseColor: [0.9137, 0.9098, 0.9019], // the light warm grey from figma
	// 		markerColor: [1, 0.2431, 0], // our --primary
	// 		glowColor: [1, 1, 1], // white
	// 		offset: [0, 2100],
	// 		markers: [
	// 			// https://vercel.com/docs/concepts/edge-network/regions
	// 			{ location: [59.3293, 18.0686], size: 0.05 }, // Stockholm
	// 			{ location: [19.076, 72.8777], size: 0.05 }, // Mumbai
	// 			{ location: [48.8566, 2.3522], size: 0.05 }, // Paris
	// 			{ location: [41.4993, -81.6944], size: 0.05 }, // Cleveland
	// 			{ location: [-33.9249, 18.4241], size: 0.05 }, // Cape Town
	// 			{ location: [53.3498, -6.2603], size: 0.05 }, // Dublin
	// 			{ location: [50.1109, 8.6821], size: 0.05 }, // Frankfurt
	// 			{ location: [-23.5558, -46.6396], size: 0.05 }, // São Paulo
	// 			{ location: [22.3193, 114.1694], size: 0.05 }, // Hong Kong
	// 			{ location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
	// 			{ location: [38.9072, -77.0369], size: 0.05 }, // DC
	// 			{ location: [37.5665, 126.978], size: 0.05 }, // Seoul
	// 			{ location: [34.6937, 135.5023], size: 0.05 }, // Osaka
	// 			{ location: [51.5072, -0.1276], size: 0.05 }, // London
	// 			{ location: [45.5152, -122.6784], size: 0.05 }, // Portland
	// 			{ location: [37.7595, -122.4367], size: 0.05 }, // SF
	// 			{ location: [1.3521, 103.8198], size: 0.05 }, // Singapore
	// 			{ location: [-33.8688, 151.2093], size: 0.05 } // Sydney
	// 		],
	// 		onRender: (state) => {
	// 			state.phi = phi;
	// 			phi += 0.003;
	// 		}
	// 	});
	// });
</script>

<h3>
	SvelteKit grows with you,<br /><span style="font-weight:bold">whatever</span> you're building
</h3>

<img src={Grow} alt="Build SSGs, MPAs, PWAs, or SPAs." />

<!-- @vedam see styles -->
<div class="canvas-wrap">
	<canvas bind:this={canvas} class="globe" width="1800" height="400" />
</div>

<div class="box">
	<p>From your local machine<br />to the edge of the world</p>
</div>

<style>
	h3 {
		margin-bottom: 3rem;
	}

	img {
		position: relative;
		/* @vedam - Dirty hack part 1
			Unfortunately I'm not able to handle the positioning/sizing correctly.
			At least not in a reasonable amount of time.
			So I tried this ugly, failing workaround. Sorry.
			Only looks correct at arround 1500px viewport-width.
			This should be done by someone who has a clue about what he's doing.

			These 7em at bottom are to push "Starts fast" down.
		*/
		margin: 5em 0 7em 0;
		width: 100%;
		height: auto;
		z-index: 1;
	}

	/* @vedam - Dirty hack part 2 */
	.canvas-wrap {
		position: absolute;
		top: 18.6em;
		left: -10.14vw;
		right: 0;
		bottom: 0;
		width: 100vw;
		height: 500px;
		overflow: hidden;
		z-index: -1;
		/* background-color: #ccc; */
	}

	/* @vedam - Dirty hack part 3 */
	.globe {
		margin-left: -16.5vw;
	}

	.box {
		position: absolute;
		max-width: 236px;
		right: -2em;
		bottom: 0;
		padding: 1.2em 1.6em 0.5em;
		background-color: var(--prime);
		color: white;
		border-radius: var(--border-r);
		z-index: 1;
	}
</style>
