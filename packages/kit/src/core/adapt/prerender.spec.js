import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { get_href, is_rel_external /*, get_tag */} from './prerender.js';

test('get_href', () => {
	assert.equal(get_href('href="/foo" target=""'), '/foo');
	assert.equal(get_href('target="" href="/foo"'), '/foo');
	assert.equal(
		get_href(
			'data:image/svg+xml,\
			<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22>\
			<text y=%22.9em%22 font-size=%2290%22>💥</text></svg>'
		),
		null
	);
	/**
	 * @TODO solve this case
	 */
	// assert.equal(get_tag('<a href="foo>bar">'), '<a href="foo>bar">');
});

test('is_rel_external', () => {
	assert.equal(is_rel_external('<a href="/foo" rel="external">'), true);
	assert.equal(is_rel_external('<a href="/foo" rel = "external">'), true);
	assert.equal(is_rel_external('<a href="/foo" rel="license external">'), true);
	assert.equal(is_rel_external('<a href="/foo" rel=\'external license\'>'), true);
	assert.equal(is_rel_external('<a href="/foo" rel=external>'), true);
	assert.equal(is_rel_external('<a href="/foo" rel="stylesheet">'), false);
	assert.equal(is_rel_external('<a href="/foo">'), false);
});

test.run();
