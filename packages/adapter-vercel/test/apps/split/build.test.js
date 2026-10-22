import fs from 'node:fs';
import path from 'node:path';
import { assert, beforeAll, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname);
const output = path.join(app, '.vercel/output');

/** @type {{ routes: Array<{ src?: string, dest?: string, handle?: string, status?: number, headers?: Record<string, string> }> }} */
let config;
beforeAll(() => (config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'))));

test('trailing slashes are removed with a single route when every route uses trailingSlash never', () => {
	const redirects = config.routes.filter((route) => route.status === 308);
	assert.deepEqual(redirects, [{ src: '^/(.+)/$', headers: { Location: '/$1' }, status: 308 }]);
});

test('the trailing slash redirect is matched before the filesystem', () => {
	const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
	const index = config.routes.findIndex((route) => route.status === 308);
	assert.ok(index < filesystem);
});
