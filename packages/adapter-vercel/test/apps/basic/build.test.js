import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert } from 'vitest';

const output = fileURLToPath(new URL('./.vercel/output', import.meta.url));
const functions = `${output}/functions/api/json`;

test('API route function is generated', () => {
	assert.ok(fs.existsSync(`${functions}.func`));
});

test('API route ISR configuration is generated', () => {
	assert.ok(fs.existsSync(`${functions}.prerender-config.json`));
});

test('__data.json function is not generated for server-only route', () => {
	assert.ok(!fs.existsSync(`${functions}/__data.json.func`));
});

test('__data.json prerender config is not generated for server-only route', () => {
	assert.ok(!fs.existsSync(`${functions}/__data.json.prerender-config.json`));
});

/** @type {{ routes: Array<{ src?: string, dest?: string, handle?: string, methods?: string[] }> }} */
const config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'));
const route_sources = config.routes.flatMap((route) =>
	typeof route.src === 'string' ? [route.src] : []
);
const api_route_sources = route_sources.filter((src) => src.includes('/api/json'));
const isr_page_route_sources = route_sources.filter((src) => src.includes('/isr'));

test('API route is present in Vercel routing configuration', () => {
	assert.ok(api_route_sources.some((src) => !src.includes('__data.json')));
});

test('__data.json route is not present in Vercel routing configuration for server-only route', () => {
	assert.ok(!api_route_sources.some((src) => src.includes('__data.json')));
});

test('__data.json function exists for ISR page route', () => {
	assert.ok(fs.existsSync(`${output}/functions/isr/__data.json.func`));
});

test('__data.json function exists in Vercel routing configuration', () => {
	assert.ok(isr_page_route_sources.some((src) => src.includes('__data.json')));
});

const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');

// each ISR route emits more than one entry, and all of them have to sit on the same
// side of the filesystem phase, so match on the prefix rather than the whole `src`
/** @param {string} prefix */
const find_indexes = (prefix) =>
	config.routes.flatMap((route, index) => (route.src?.startsWith(prefix) ? [index] : []));

test('ISR routes capture the requested pathname', () => {
	const route = config.routes.find((route) => route.src === '^(/isr-trailing-slash/?)$');
	assert.equal(route?.dest, '/isr-trailing-slash?__pathname=$1');
});

test('static ISR routes are matched before the filesystem', () => {
	const indexes = find_indexes('^(/isr-trailing-slash/?)');
	assert.ok(indexes.length > 0);
	assert.ok(indexes.every((index) => index < filesystem));
});

test('dynamic ISR routes are matched after the filesystem', () => {
	const indexes = find_indexes('^(/isr/([^/]+?)/?)');
	assert.ok(indexes.length > 0);
	assert.ok(indexes.every((index) => index > filesystem));
});

test('only GET and HEAD are served the cached ISR response', () => {
	const [cached, uncached] = config.routes.filter((route) => route.src === '^(/isr-endpoint/?)$');

	assert.deepEqual(cached?.methods, ['GET', 'HEAD']);
	assert.equal(cached?.dest, '/isr-endpoint?__pathname=$1');

	assert.equal(uncached?.methods, undefined);
	assert.match(uncached?.dest ?? '', /^\/!\[-\]\/\d+\?__pathname=\$1$/);
});

test('process.cwd() is traced from the project directory', () => {
	const function_dir = fs.realpathSync(`${output}/functions/process-cwd.func`);
	assert.ok(fs.existsSync(`${function_dir}/adapter-vercel/test/apps/basic/asset.txt`));
});
