import assert from 'node:assert/strict';
import fs from 'node:fs';

const output = '.vercel/output';
const functions = `${output}/functions/api/json`;

assert(fs.existsSync(`${functions}.func`), 'expected the API route function to be generated');
assert(
	fs.existsSync(`${functions}.prerender-config.json`),
	'expected the API route ISR configuration to be generated'
);

assert(
	!fs.existsSync(`${functions}/__data.json.func`),
	'did not expect a data function for a server-only route'
);
assert(
	!fs.existsSync(`${functions}/__data.json.prerender-config.json`),
	'did not expect data ISR configuration for a server-only route'
);

/** @type {{ routes: Array<{ src?: string }> }} */
const config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));
const route_sources = config.routes.flatMap((route) =>
	typeof route.src === 'string' ? [route.src] : []
);
const api_route_sources = route_sources.filter((src) => src.includes('/api/json'));
const isr_page_route_sources = route_sources.filter((src) => src.includes('/isr'));
assert(
	api_route_sources.some((src) => !src.includes('__data.json')),
	'expected the API route to be present in the Vercel routing configuration'
);
assert(
	!api_route_sources.some((src) => src.includes('__data.json')),
	'did not expect a data endpoint for a server-only route'
);

assert(
	fs.existsSync(`${output}/functions/isr/__data.json.func`),
	'expected a data function for an ISR page route'
);
assert(
	isr_page_route_sources.some((src) => src.includes('__data.json')),
	'expected the ISR page data endpoint to remain in the Vercel routing configuration'
);
