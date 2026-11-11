import fs from 'node:fs';
import path from 'node:path';
import { assert, beforeAll, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname);
const output = path.join(app, '.vercel/output');
const functions = `${output}/functions/api/json`;

/** @type {{ routes: Array<{ src?: string, dest?: string, handle?: string }> }} */
let config;
beforeAll(() => (config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'))));

/** @param {string} pathname */
const sources = (pathname) =>
	config.routes.flatMap((route) =>
		typeof route.src === 'string' && route.src.includes(pathname) ? [route.src] : []
	);

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

test('API route is present in Vercel routing configuration', () => {
	assert.ok(sources('/api/json').some((src) => !src.includes('__data.json')));
});

test('__data.json route is not present in Vercel routing configuration for server-only route', () => {
	assert.ok(!sources('/api/json').some((src) => src.includes('__data.json')));
});

test('__data.json function exists for ISR page route', () => {
	assert.ok(fs.existsSync(`${output}/functions/isr/__data.json.func`));
});

test('__data.json function exists in Vercel routing configuration', () => {
	assert.ok(sources('/isr').some((src) => src.includes('__data.json')));
});

test('ISR routes capture the requested pathname', () => {
	const route = config.routes.find((route) => route.src === '^(/isr-trailing-slash/?)$');
	assert.equal(route?.dest, '/isr-trailing-slash?__pathname=$1');
});

test('static ISR routes are matched before the filesystem', () => {
	const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
	const index = config.routes.findIndex((route) => route.src === '^(/isr-trailing-slash/?)$');
	assert.ok(index < filesystem);
});

test('dynamic ISR routes are matched after the filesystem', () => {
	const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
	const index = config.routes.findIndex((route) => route.src === '^(/isr/([^/]+?)/?)$');
	assert.ok(index > filesystem);
});

test('process.cwd() is traced from the project directory', () => {
	const function_dir = fs.realpathSync(`${output}/functions/process-cwd.func`);
	assert.ok(fs.existsSync(`${function_dir}/asset.txt`));
});
