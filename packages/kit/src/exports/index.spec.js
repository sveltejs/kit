import { error, isHttpError, isRedirect, normalizeUrl, redirect } from './index.js';
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
		try {
			redirect(307, '/valid-location');
			assert.fail('Expected redirect to throw');
		} catch (e) {
			if (!isRedirect(e)) {
				assert.fail('Expected a Redirect error');
			}

			assert.equal(e.status, 307);
			assert.equal(e.location, '/valid-location');
		}
	});

	it('throws a descriptive error for invalid redirect locations', () => {
		assert.throws(
			() => redirect(307, '/invalid\r\nset-cookie: x=y'),
			'Invalid redirect location "/invalid\\r\\nset-cookie: x=y": this string contains characters that cannot be used in HTTP headers'
		);
	});
});

describe('error', () => {
	it('adds status to the body', () => {
		try {
			error(418, 'teapot');
			assert.fail('Expected error to throw');
		} catch (e) {
			if (!isHttpError(e)) {
				assert.fail('Expected an HttpError');
			}

			assert.equal(e.status, 418);
			assert.deepEqual(e.body, { message: 'teapot', status: 418 });
		}
	});

	it('merges additional body properties', () => {
		try {
			// @ts-expect-error
			error(400, 'Bad request', { code: 'bad_request' });
			assert.fail('Expected error to throw');
		} catch (e) {
			if (!isHttpError(e)) {
				assert.fail('Expected an HttpError');
			}

			assert.equal(e.status, 400);
			assert.deepEqual(
				e.body,
				/** @type {any} */ ({
					code: 'bad_request',
					message: 'Bad request',
					status: 400
				})
			);
		}
	});
});
