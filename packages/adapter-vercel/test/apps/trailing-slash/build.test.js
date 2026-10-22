import fs from 'node:fs';
import path from 'node:path';
import { assert, beforeAll, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname);
const output = path.join(app, '.vercel/output');

/** @type {{ routes: Array<{ src?: string, dest?: string, handle?: string, status?: number, check?: boolean, headers?: Record<string, string> }>, overrides: Record<string, { path: string }> }} */
let config;
beforeAll(() => (config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'))));

test('trailing slashes are added with a single route when every route uses trailingSlash always', () => {
	const redirects = config.routes.filter((route) => route.status === 308);
	assert.equal(redirects.length, 1);
	assert.equal(redirects[0].headers?.Location, '$1/');
});

test('the trailing slash redirect is matched after the filesystem', () => {
	const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
	const index = config.routes.findIndex((route) => route.status === 308);
	assert.ok(index > filesystem);
});

test('prerendered pages are renamed so that Vercel does not serve them without a trailing slash', () => {
	assert.deepEqual(config.overrides['prerendered/a/index.html'], {
		path: 'prerendered/a/__index.html'
	});

	const miss = config.routes.findIndex((route) => route.handle === 'miss');
	assert.deepEqual(config.routes[miss + 1], {
		src: '^(/.+)/$',
		dest: '$1/__index.html',
		check: true
	});
});
