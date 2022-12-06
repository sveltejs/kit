<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { csvParse } from 'd3-dsv';
	import * as topojson from 'topojson-client';

	import Grow from './grow.svg';

	onMount(() => {
		const width = 1104, height = 575;

		// https://vercel.com/docs/concepts/edge-network/regions
		const datacenters_csv = `lon,lat\n18.0686,59.3293\n72.8777,19.076\n2.3522,48.8566\n-81.6944,41.4993\n18.4241,-33.9249\n-6.2603,53.3498\n8.6821,50.1109\n-46.6396,-23.5558\n114.1694,22.3193\n139.6503,35.6762\n-77.0369,38.9072\n126.978,37.5665\n135.5023,34.6937\n-0.1276,51.5072\n-122.6784,45.5152\n-122.4367,37.7595\n103.8198,1.3521\n151.2093,-33.8688`;
		const datacenters = csvParse(datacenters_csv);
		// for now, hardcode SF datacenter
		const selected = { lon:-122.4367, lat:37.7595 };

		const projection = d3.geoMercator()
			.center([0, selected.lat])
			.scale(200)
			.rotate([-selected.lon + 15 /** why is this adjustment needed? */, 0]);

		const svg = d3.select('#svg').append('svg')
			.attr('width', width)
			.attr('height', height);

		const path = d3.geoPath()
			.projection(projection);

		const g = svg.append('g');

		const json_url = 'https://gist.githubusercontent.com/olemi/d4fb825df71c2939405e0017e360cd73/raw/d6f9f0e9e8bd33183454250bd8b808953869edd2/world-110m2.json';
		d3.json(json_url).then((topology) => {

			g.selectAll('path')
				.data(topojson.feature(topology, topology.objects.countries).features)
				.enter().append('path')
				.attr('d', path);

			g.selectAll('circle')
				.data(datacenters)
				.enter()
				.append('circle')
				.attr('cx', /** @param {{lon: number, lat:number}} d */ (d) => {
					return projection([d.lon, d.lat])[0];
				})
				.attr('cy', /** @param {{lon: number, lat:number}} d */ (d) => {
					return projection([d.lon, d.lat])[1];
				})
				.attr('r', /** @param {{lon: number, lat:number}} d */ (d) => {
					return d.lon - selected.lon < .01 && d.lat - selected.lat < .01 ? 10 : 4;
				})
				.style('fill', '#ff3e00');
		});
	});
</script>

<h2>
	SvelteKit grows with you,<br /><span style="font-weight:bold">whatever</span> you're building
</h2>

<img src={Grow} alt="Build SSGs, MPAs, PWAs, or SPAs." />

<!-- @vedam see styles -->
<!-- <div class="canvas-wrap">
	<canvas bind:this={canvas} class="globe" width="1800" height="400" />
</div> -->

<div id="svg"></div>

<div class="box">
	<p>From your local machine<br />to the edge of the world</p>
</div>

<style>
	h2 {
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

			These em at bottom are to push "Starts fast" down.
		*/
		margin: 0 0 12em 0;
		width: 100%;
		height: auto;
		z-index: 1;
	}

	/* @vedam - Dirty hack part 2 */
	#svg {
		position: absolute;
		top: 18em;
		left: var(--side-nav);
		right: 0;
		bottom: 0;
		width: 100vw;
		height: 500px;
		overflow: hidden;
		z-index: -1;
		/* background-color: #ccc; */
	}

	.box {
		position: absolute;
		max-width: 236px;
		right: var(--side-nav);
		bottom: 0;
		padding: 1.2em 1.6em 0.5em;
		background-color: var(--prime);
		color: white;
		border-radius: var(--border-r);
		z-index: 1;
	}

	:global(path) {
  	stroke: white;
  	stroke-width: 0.25px;
  	fill: grey;
	}
</style>
