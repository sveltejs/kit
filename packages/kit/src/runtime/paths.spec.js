import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { set_paths, base, assets } from './paths.js';

test('set_paths', () => {
	const basePath = '/src';
	const assetPath = '/assets';
	set_paths({ base: basePath, assets: '/assets' });

	assert.equal(basePath, base);
	assert.equal(assetPath, assets);
});

test.run();
