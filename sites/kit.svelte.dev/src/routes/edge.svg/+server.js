import { geoPath } from 'd3-geo';
import { geoSatellite } from 'd3-geo-projection';
import * as topojson from 'topojson-client';
import topology from './land-110m.json';
import countries from './countries.json';

const land = topojson.feature(topology, topology.objects.land);

const font_size = 36;

/**
 * distance of the satellite observer from the earth
 * https://github.com/d3/d3-geo-projection#satellite_distance
 */
const distance = 8;

const w = 1000;
const h = 1000;

const rad_to_deg = 180 / Math.PI;

const projection = geoSatellite()
	.distance(distance)
	.clipAngle(Math.acos(1 / distance) * rad_to_deg)
	.translate([w / 2, h / 2])
	.scale(450)
	.precision(0.5);

let isDark = false;

const path = geoPath(projection);

/**
 * @param {string | null} lat
 * @param {string | null} lon
 * @param {string} city
 * @param {string} country
 */
function render(lat, lon, city, country) {
	const coords = lat && lon ? [+lon, +lat] : [-74, 40.7];

	// spin globe a little west of the user's location so that it isn't
	// dead centre, and tilt them slightly towards the vertical center
	projection.rotate([-coords[0] - 30, -coords[1] * (30 / 90), 0]);

	const dot = lon && lat ? projection([lon, lat]) : null;

	const MAX_LABEL_LENGTH = 27;
	const DEFAULT_LABEL = 'Your location';

	let label = [city, country].filter(Boolean).join(', ') || DEFAULT_LABEL;
	if (label.length > MAX_LABEL_LENGTH) label = city ?? DEFAULT_LABEL;
	if (label.length > MAX_LABEL_LENGTH) label = country ?? DEFAULT_LABEL;
	if (label.length > MAX_LABEL_LENGTH) label = DEFAULT_LABEL;

	return `<?xml version="1.0" encoding="UTF-8"?>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
			<style>
				path {
					stroke: none;
				}

				.ocean {
					fill: rgb(185,183,172);
				}

				.land {
					fill: white;
				}

				.highlight {
					fill: #ff3e00;
				}

				.dot {
					fill: #ff3e00;
					stroke: white;
					stroke-width: 5;
				}

				${
					isDark
						? `.ocean {
					fill: rgb(120,120,120);
				}

				.land {
					fill: #222;
				}

				.dot {
					stroke: #222;
				}`
						: ''
				} 
			</style>

			<path d="${path({ type: 'Sphere' })}" class="ocean"/>
			<path d="${path(land)}" class="land"/>

			${
				dot
					? `
			<g transform="translate(${dot[0]},${dot[1]})">
				<circle r="20" class="dot"/>
				<rect x="50" y="-30" width="${font_size * 0.6 * label.length + 40}" height="60" class="highlight"/>
				<polygon points="35,0 50,-10 50,10" class="highlight" />
				<text
					x="70"
					fill="white"
					text-anchor="start"
					alignment-baseline="middle"
					dominant-baseline="middle"
					style="font-family: 'Courier', 'Courier New'; font-size: ${font_size}px; font-weight: bold"
				>${label.toUpperCase()}</text>
			</g>`
					: ''
			}
		</svg>
	`;
}

export function GET({ request, url }) {
	const h = request.headers;

	isDark = !!url.searchParams.has('dark');

	const latitude = h.get('x-vercel-ip-latitude') ?? '';
	const longitude = h.get('x-vercel-ip-longitude') ?? '';
	const city = h.get('x-vercel-ip-city') ?? '';
	const country = countries[h.get('x-vercel-ip-country')];

	const svg = render(latitude, longitude, decodeURIComponent(city), country).replace(
		/\d\.\d+/g,
		(match) => match.slice(0, 4)
	);

	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml',
			'cache-control': 'private, max-age=3600'
		}
	});
}
