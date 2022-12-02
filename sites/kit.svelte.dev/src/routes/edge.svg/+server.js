import { geolocation } from '@vercel/edge';
import { geoPath, geoGraticule10 } from 'd3-geo';
import { geoSatellite } from 'd3-geo-projection';
import * as topojson from 'topojson-client';
import topology from './land-110m.json';

const land = topojson.feature(topology, topology.objects.land);
const graticule = geoGraticule10();

/**
 * distance of the satellite observer from the earth
 * https://github.com/d3/d3-geo-projection#satellite_distance
 */
const distance = 8;

const w = 1000;
const h = 1000;

const rad_to_deg = 180 / Math.PI;
const deg_to_rad = Math.PI / 180;

const projection = geoSatellite()
	.distance(distance)
	.clipAngle(Math.acos(1 / distance) * rad_to_deg)
	.translate([w / 2, h / 2])
	.scale(450)
	.precision(0.5);

const path = geoPath(projection);

/**
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} city
 * @returns
 */
function render(lat, lon, city) {
	projection.rotate([-lon - 10, -lat + 20, 0]);

	const sphere = path({ type: 'Sphere' });

	const lambda = deg_to_rad * -lon;
	const phi = deg_to_rad * (90 - lat);

	const x = projection([lon, lat]);
	console.log({ lon, lat, lambda, phi, x });

	return `<?xml version="1.0" encoding="UTF-8"?>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
			<radialGradient id="shadow" fx="40%" fy="50%" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="hsla(0, 0%, 0%, 0.4)" />
				<stop offset="10%" stop-color="hsla(0, 0%, 0%, 0.3)" />
				<stop offset="60%" stop-color="hsla(0, 0%, 0%, 0.1)" />
				<stop offset="100%" stop-color="hsla(0, 0%, 0%, 0)"  />
			</radialGradient>

			<radialGradient id="ocean" fx="25%" fy="25%" cx="25%" cy="25%" r="75%">
				<stop offset="0%" stop-color="hsl(206, 64%, 98%)" />
				<stop offset="100%" stop-color="hsl(206, 20%, 80%)"  />
			</radialGradient>

			<radialGradient id="land" fx="25%" fy="25%" cx="25%" cy="25%" r="75%">
				<stop offset="0%" stop-color="white" />
				<stop offset="100%" stop-color="hsl(206, 64%, 98%)"  />
			</radialGradient>

			<ellipse cx="520" cy="850" rx="400" ry="100" fill="url(#shadow)" />

			<path d="${sphere}" stroke="black" fill="url(#ocean)"/>
			<path d="${path(graticule)}" stroke="rgba(0,0,0,0.2)" fill="none"/>
			<path d="${path(land)}" stroke="black" fill="url(#land)"/>
			<path d="${sphere}" stroke="black" fill="none"/>

			<g transform="translate(${x[0]},${x[1]})">
				<circle r="5" stroke="#ff3e00" stroke-width="5" stroke-opacity="1" fill="none"/>
				<circle r="15" stroke="#ff3e00" stroke-width="5" stroke-opacity="0.6" fill="none"/>
				<circle r="25" stroke="#ff3e00" stroke-width="5" stroke-opacity="0.2" fill="none"/>
				<text
					x="40"
					fill="#ff3e00"
					text-anchor="start"
					alignment-baseline="middle"
					style="font-family: 'Overpass', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
					Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; font-size: 30;"
				>${city}</text>
			</g>
		</svg>
	`;
}

/** @type {import('./$types').RequestHandler} */
export function GET({ request, url }) {
	const {
		latitude = url.searchParams.get('lat') ?? '40.7',
		longitude = url.searchParams.get('lon') ?? '-74',
		city = url.searchParams.get('city') ?? 'New York City'
	} = geolocation(request);

	const svg = render(+latitude, +longitude, decodeURIComponent(city)).replace(/\d\.\d+/g, (match) =>
		match.slice(0, 4)
	);

	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml'
		}
	});
}
