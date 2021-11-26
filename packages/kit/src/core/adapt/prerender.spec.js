import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { get_href, is_html, is_rel_external } from './prerender.js';

test('get_href', () => {
	assert.equal(get_href('href="/foo" target=""'), '/foo');
	assert.equal(get_href('target="" href="/foo"'), '/foo');
	assert.equal(get_href('target="" href="/foo"'), '/foo');
	assert.equal(get_href('target="" href="/foo"'), '/foo');
	assert.equal(get_href('target="" href="#id"'), '#id');
	assert.equal(
		get_href('target="" href="mailto:m.bluth@example.com"'),
		'mailto:m.bluth@example.com'
	);
	assert.equal(get_href('target="" href="tel:+123456789"'), 'tel:+123456789');
	assert.equal(get_href('target="" href="https://google.com"'), 'https://google.com');
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

test('is_html', () => {
	assert.equal(is_html('text/html'), true);
	assert.equal(is_html('text/html; charset=utf-8'), true);
	assert.equal(is_html('TEXT/HTML; charset=utf-8'), true);
});

test.run();
