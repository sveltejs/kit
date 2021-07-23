import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { get_href } from './prerender.js';

test('get_href', () => {
	assert.equal(get_href('href="/foo" target=""'), '/foo');
	assert.equal(get_href('target="" href="/foo"'), '/foo');
});

test.run();
