import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { clean_html, get_href, get_src, get_srcset_urls, is_rel_external } from './prerender.js';

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
	assert.equal(is_rel_external('<a href="/foo" rel="external nofollow">'), true);
	assert.equal(is_rel_external('<a href="/foo" rel = "external">'), true);
	assert.equal(is_rel_external('<a href="/foo" rel="license external">'), true);
	assert.equal(is_rel_external('<a href="/foo" rel=\'external license\'>'), true);
	assert.equal(is_rel_external('<a href="/foo" rel=external>'), true);
	assert.equal(is_rel_external('<a href="/foo" rel="stylesheet">'), false);
	assert.equal(is_rel_external('<a href="/foo">'), false);
	assert.equal(is_rel_external('<a href="#id">'), true);
	assert.equal(is_rel_external(`<a href='#id'>`), true);
	assert.equal(is_rel_external(`<a href = '#id'>`), true);
	assert.equal(is_rel_external('<a href="mailto:m.bluth@example.com">'), true);
	assert.equal(is_rel_external('<a href="tel:+123456789">'), true);
	assert.equal(is_rel_external('<a href="https://google.com">'), false);
	assert.equal(is_rel_external('<a href="//google.com">'), false);
});

test('clean_html', () => {
	assert.equal(
		clean_html(`<html><script>var a = 1;</script><!-- comments --><div /></html>`),
		'<html><script></script><div /></html>'
	);
	assert.equal(
		clean_html(
			`<html><script>var a = 1;</script><style>h1 { display: block; }</style><!-- comments --><div /></html>`
		),
		'<html><script></script><style></style><div /></html>'
	);
	assert.equal(
		clean_html(
			`<html><script type="text/javascript">var a = 1;</script><style type="text/css">h1 { display: block; }</style><!-- comments --><div /></html>`
		),
		`<html><script type="text/javascript"></script><style type="text/css"></style><div /></html>`
	);
});

test('get_src', () => {
	// internal image
	assert.equal(get_src('<img src="/path/image.png" />'), '/path/image.png');
	assert.equal(get_src('<img src="//path/image.png" />'), '//path/image.png');
	// external image
	assert.equal(get_src('<img src="https://website.com/a.png" />'), 'https://website.com/a.png');
	// base64 data as image
	assert.equal(
		get_src('<img src="data:image/jpeg;base64,LzlqLzRBQ" />'),
		'data:image/jpeg;base64,LzlqLzRBQ'
	);
});

test('get_srcset_urls', () => {
	assert.equal(get_srcset_urls(``), []);
	assert.equal(get_srcset_urls(`<img srcset=''>`), []);
	assert.equal(get_srcset_urls(`<img srcset=' '>`), []);
	assert.equal(get_srcset_urls(`<img srcset="">`), []);
	assert.equal(get_srcset_urls(`<img srcset=" ">`), []);

	// using single quote
	assert.equal(
		get_srcset_urls(
			`<img srcset=' /wp-content/uploads/flamingo4x.jpg 4x, /wp-content/uploads/flamingo3x.jpg 3x,  /wp-content/uploads/flamingo2x.jpg 2x,	/wp-content/uploads/flamingo1x.jpg 1x' src='/wp-content/uploads/flamingo-fallback.jpg'>`
		),
		[
			'/wp-content/uploads/flamingo4x.jpg',
			'/wp-content/uploads/flamingo3x.jpg',
			'/wp-content/uploads/flamingo2x.jpg',
			'/wp-content/uploads/flamingo1x.jpg'
		]
	);
	// using double quote
	assert.equal(
		get_srcset_urls(
			`<img srcset="/wp-content/uploads/flamingo4x.jpg 4x, /wp-content/uploads/flamingo3x.jpg 3x,/wp-content/uploads/flamingo2x.jpg 2x,/wp-content/uploads/flamingo1x.jpg 1x" src="/wp-content/uploads/flamingo-fallback.jpg">`
		),
		[
			'/wp-content/uploads/flamingo4x.jpg',
			'/wp-content/uploads/flamingo3x.jpg',
			'/wp-content/uploads/flamingo2x.jpg',
			'/wp-content/uploads/flamingo1x.jpg'
		]
	);
	assert.equal(
		get_srcset_urls(`<img srcset="
		/wp-content/uploads/flamingo4x.jpg 4x, 
		/wp-content/uploads/flamingo3x.jpg 3x, 
		/wp-content/uploads/flamingo2x.jpg 2x, 
		/wp-content/uploads/flamingo1x.jpg 1x" 
		src="/wp-content/uploads/flamingo-fallback.jpg">`),
		[
			'/wp-content/uploads/flamingo4x.jpg',
			'/wp-content/uploads/flamingo3x.jpg',
			'/wp-content/uploads/flamingo2x.jpg',
			'/wp-content/uploads/flamingo1x.jpg'
		]
	);
	assert.equal(
		get_srcset_urls(`<img srcset="/wp-content/uploads/flamingo4x.jpg 4x, 
	/wp-content/uploads/flamingo3x.jpg 3x, 
	/wp-content/uploads/flamingo2x.jpg 2x, 
	/wp-content/uploads/flamingo1x.jpg 1x" 
	src="/wp-content/uploads/flamingo-fallback.jpg">`),
		[
			'/wp-content/uploads/flamingo4x.jpg',
			'/wp-content/uploads/flamingo3x.jpg',
			'/wp-content/uploads/flamingo2x.jpg',
			'/wp-content/uploads/flamingo1x.jpg'
		]
	);

	assert.equal(
		get_srcset_urls(`<img srcset="https://abc.com/wp-content/uploads/flamingo4x.jpg 4x, 
		https://abc.com/wp-content/uploads/flamingo3x.jpg 3x, 
		https://abc.com/wp-content/uploads/flamingo2x.jpg 2x, 
		https://abc.com/wp-content/uploads/flamingo1x.jpg 1x" 
	src="/wp-content/uploads/flamingo-fallback.jpg">`),
		[
			'https://abc.com/wp-content/uploads/flamingo4x.jpg',
			'https://abc.com/wp-content/uploads/flamingo3x.jpg',
			'https://abc.com/wp-content/uploads/flamingo2x.jpg',
			'https://abc.com/wp-content/uploads/flamingo1x.jpg'
		]
	);
});

test.run();
