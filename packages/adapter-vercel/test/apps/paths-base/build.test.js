import fs from 'node:fs';
import path from 'node:path';
import { assert, beforeAll, test } from 'vitest';
import { deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname);
const output = path.join(app, '.vercel/output');

/** @type {{ overrides: Record<string, { path: string }> }} */
let config;
beforeAll(() => (config = JSON.parse(fs.readFileSync(`${output}/config.json`, 'utf8'))));

test('prerendered pages are written below the base path', () => {
	assert.deepEqual(config.overrides, {
		'base/index.html': { path: 'base' },
		'base/prerendered/a.html': { path: 'base/prerendered/a' }
	});
});

test('overrides refer to files that exist', () => {
	for (const file of Object.keys(config.overrides)) {
		assert.ok(fs.existsSync(`${output}/static/${file}`), `${file} does not exist`);
	}
});
