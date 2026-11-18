import {
	error,
	invalid,
	isHttpError,
	isRedirect,
	isValidationError,
	normalizeUrl,
	redirect
} from './index.js';
import { assert, describe, expect, it, vi } from 'vitest';

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

	it('should normalize route requests for .html pages', () => {
		const original = new URL('http://example.com/foo.html__route.js');
		const { url, wasNormalized, denormalize } = normalizeUrl(original);

		assert.equal(wasNormalized, true);
		assert.equal(url.pathname, '/foo.html');
		assert.equal(denormalize('/baz.html').href, 'http://example.com/baz.html__route.js');
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

	it('throws Redirect for external locations with external: true', () => {
		try {
			redirect(307, 'https://google.de', { external: true });
			assert.fail('Expected redirect to throw');
		} catch (e) {
			if (!isRedirect(e)) {
				assert.fail('Expected a Redirect error');
			}

			assert.equal(e.status, 307);
			assert.equal(e.location, 'https://google.de');
		}
	});

	it('throws Redirect for allowlisted external locations', () => {
		try {
			redirect(307, 'https://google.de/search', { external: ['https://google.de'] });
			assert.fail('Expected redirect to throw');
		} catch (e) {
			if (!isRedirect(e)) {
				assert.fail('Expected a Redirect error');
			}

			assert.equal(e.status, 307);
			assert.equal(e.location, 'https://google.de/search');
		}
	});

	it('throws a descriptive error for external redirect locations', () => {
		expect(() => redirect(307, 'https://google.de')).toThrowKitError(
			'redirect_external_not_allowed',
			{ contains: ['"https://google.de"'] }
		);
	});

	it('throws a descriptive error for redirect locations that parse as external', () => {
		for (const location of [' https://google.de', '\\\\google.de', 'x:foo']) {
			expect(() => redirect(307, location)).toThrowKitError('redirect_external_not_allowed', {
				contains: [JSON.stringify(location)]
			});
		}
	});

	it('throws a descriptive error for javascript URLs with external: true', () => {
		expect(() => redirect(307, 'javascript:alert(1)', { external: true })).toThrowKitError(
			'redirect_external_javascript',
			{ contains: ['"javascript:alert(1)"'] }
		);
	});

	it('throws a descriptive error for normalized javascript URLs with external: true', () => {
		expect(() => redirect(307, 'java\tscript:alert(1)', { external: true })).toThrowKitError(
			'redirect_external_javascript',
			{ contains: ['"java\\tscript:alert(1)"'] }
		);
	});

	it('throws Redirect for allowlisted javascript URLs', () => {
		try {
			redirect(307, 'javascript:alert(1)', { external: ['javascript:'] });
			assert.fail('Expected redirect to throw');
		} catch (e) {
			if (!isRedirect(e)) {
				assert.fail('Expected a Redirect error');
			}

			assert.equal(e.status, 307);
			assert.equal(e.location, 'javascript:alert(1)');
		}
	});

	it('throws a descriptive error for disallowed external locations', () => {
		expect(() =>
			redirect(307, 'https://evil.com', { external: ['https://google.de'] })
		).toThrowKitError('redirect_external_not_in_allowlist', { contains: ['"https://evil.com"'] });
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

describe('invalid statuses', () => {
	it.each([undefined, 302, 600, NaN])('rejects error status %s', (status) => {
		expect(() => error(/** @type {any} */ (status), 'nope')).toThrowKitError(
			'invalid_error_status',
			{ contains: [`${status} is invalid`] }
		);
	});

	it.each([undefined, 200, 309, 555])('rejects redirect status %s', (status) => {
		/** @type {unknown} */
		let caught;
		try {
			redirect(/** @type {any} */ (status), '/a');
		} catch (e) {
			caught = e;
		}

		assert.equal(isRedirect(caught), false);
		expect(caught).toBeKitError('invalid_redirect_status', { contains: [`${status} is invalid`] });
	});

	it('still accepts a deprecated App.Error body, warning about it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		try {
			error(404, /** @type {any} */ ({ message: 'Not here', code: 'missing' }));
			assert.fail('Expected error to throw');
		} catch (e) {
			if (!isHttpError(e)) assert.fail('Expected an HttpError');
			assert.deepEqual(
				e.body,
				/** @type {any} */ ({ code: 'missing', message: 'Not here', status: 404 })
			);
		}

		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toContainKitDiagnostic('error_body_deprecated');
		warn.mockRestore();
	});
});

describe('invalid', () => {
	it('throws a detectable validation error', () => {
		try {
			invalid('Invalid value');
		} catch (e) {
			assert.equal(isValidationError(e), true);
			assert.equal(isValidationError(new Error('Invalid value')), false);
		}
	});
});
