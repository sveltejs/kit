import { isRedirect, normalizeUrl, redirect } from './index.js';
import { assert, describe, it } from 'vitest';

describe('normalizeUrl', () => {
	it('noop for regular url', () => {
		const original = new URL('http://example.com/foo/bar');
		const { url, wasNormalized, denormalize } = normalizeUrl(original);

		assert.equal(wasNormalized, false);
		assert.equal(url.href, original.href);
		assert.equal(denormalize().href, original.href);
		assert.equal(denormalize('/baz').href, 'http://example.com/baz');
		assert.equal(
			denormalize('?some=query#hash').href,
			'http://example.com/foo/bar?some=query#hash'
		);
		assert.equal(denormalize('http://somethingelse.com/').href, 'http://somethingelse.com/');
		assert.equal(
			denormalize(new URL('http://somethingelse.com/')).href,
			'http://somethingelse.com/'
		);
	});

	it('should normalize trailing slash', () => {
		const original = new URL('http://example.com/foo/bar/');
		const { url, wasNormalized, denormalize } = normalizeUrl(original);

		assert.equal(wasNormalized, true);
		assert.equal(url.href, original.href.slice(0, -1));
		assert.equal(denormalize().href, original.href);
		assert.equal(denormalize('/baz').href, 'http://example.com/baz/');
	});

	it('should normalize data request route', () => {
		const original = new URL('http://example.com/foo/__data.json');
		const { url, wasNormalized, denormalize } = normalizeUrl(original);

		assert.equal(wasNormalized, true);
		assert.equal(url.href, 'http://example.com/foo');
		assert.equal(denormalize().href, original.href);
		assert.equal(denormalize('/baz').href, 'http://example.com/baz/__data.json');
	});

	it('should normalize route request route', () => {
		const original = new URL('http://example.com/foo/__route.js');
		const { url, wasNormalized, denormalize } = normalizeUrl(original);

		assert.equal(wasNormalized, true);
		assert.equal(url.href, 'http://example.com/foo');
		assert.equal(denormalize().href, original.href);
		assert.equal(denormalize('/baz').href, 'http://example.com/baz/__route.js');
	});
});

describe('redirect', () => {
	it('throws Redirect for valid locations', () => {
		const e = assert.throws(() => redirect(307, '/valid-location'));
		assert.ok(isRedirect(e));
		assert.equal(e.status, 307);
		assert.equal(e.location, '/valid-location');
	});

	it('throws a descriptive error for invalid redirect locations', () => {
		assert.throws(
			() => redirect(307, '/invalid\r\nset-cookie: x=y'),
			'Invalid redirect location "/invalid\\r\\nset-cookie: x=y": this string contains characters that cannot be used in HTTP headers'
		);
	});

	it('encodes non-ASCII characters', () => {
		const e = assert.throws(() => redirect(303, '/ㄱ'));
		assert.ok(isRedirect(e));
		assert.equal(e.status, 303);
		assert.equal(e.location, '/%E3%84%B1');
	});

	it('preserves already percent-encoded characters for relative locations', () => {
		const e = assert.throws(() => redirect(307, '/%E3%84%B1'));
		assert.ok(isRedirect(e));
		assert.equal(e.location, '/%E3%84%B1');
	});

	it('preserves already percent-encoded characters for absolute locations', () => {
		const e = assert.throws(() => redirect(307, 'http://%E3%84%B1.com/%E3%84%B1'));
		assert.ok(isRedirect(e));
		assert.equal(e.location, 'http://xn--ypd.com/%E3%84%B1');
	});

	it('preserves pathname relative locations', () => {
		const e = assert.throws(() => redirect(303, '../'));
		assert.ok(isRedirect(e));
		assert.equal(e.status, 303);
		assert.equal(e.location, '../');
	});

	it('preserves protocol relative locations', () => {
		const e = assert.throws(() => redirect(303, '//example.com/a'));
		assert.ok(isRedirect(e));
		assert.equal(e.status, 303);
		assert.equal(e.location, '//example.com/a');
	});

	it('encodes non-ASCII characters while preserving URL structure', () => {
		const e = assert.throws(() => redirect(303, '/path/한글?q=값#섹션'));
		assert.ok(isRedirect(e));
		assert.equal(e.location, '/path/%ED%95%9C%EA%B8%80?q=%EA%B0%92#%EC%84%B9%EC%85%98');
	});

	it('uses punycode for non-ASCII hosts', () => {
		const e = assert.throws(() => redirect(303, 'https://내도메인.한국/'));
		assert.ok(isRedirect(e));
		assert.equal(e.status, 303);
		assert.equal(e.location, 'https://xn--220b31d95hq8o.xn--3e0b707e/');
	});
});
