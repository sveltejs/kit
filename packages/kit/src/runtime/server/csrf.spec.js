import { assert, test, describe } from 'vitest';
import { get_self_origin, is_csrf_forbidden, is_remote_forbidden } from './csrf.js';

describe('get_self_origin', () => {
	test('falls back to the request URL origin when paths.origin is empty', () => {
		// The default (`paths.origin: ''`, meaning "auto") derives the self-origin from
		// `request.url`, preserving the historical CSRF behaviour.
		assert.equal(get_self_origin('', 'http://localhost:4173'), 'http://localhost:4173');
	});

	test('uses the configured paths.origin when set, even if it differs from the request URL origin', () => {
		// This is the case preview deployments and apps behind reverse proxies need: the
		// request URL origin is unknown or differs from the canonical deployment origin,
		// so `paths.origin` is trusted instead.
		assert.equal(
			get_self_origin('http://configured-origin.test', 'http://localhost:4173'),
			'http://configured-origin.test'
		);
	});

	test('uses the configured paths.origin even when the request URL origin is empty', () => {
		assert.equal(get_self_origin('https://my-site.com', ''), 'https://my-site.com');
	});

	test('falls back to the request URL origin when both are empty', () => {
		assert.equal(get_self_origin('', ''), '');
	});
});

describe('is_csrf_forbidden', () => {
	/** @param {RequestInit & { method?: string; headers?: Record<string, string> }} init */
	const form_post = (init = {}) =>
		new Request('http://self.test/csrf', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			...init
		});

	test('forbids a form submission whose origin differs from the self-origin', () => {
		assert.equal(
			is_csrf_forbidden({
				request: form_post({
					headers: {
						'content-type': 'application/x-www-form-urlencoded',
						origin: 'http://other.test'
					}
				}),
				request_origin: 'http://other.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			true
		);
	});

	test('allows a form submission whose origin matches the request URL origin but not paths.origin', () => {
		// Mirrors the bug fixed by `paths.origin`: when `self_origin` is the configured
		// `paths.origin` rather than the request URL origin, a request whose `origin`
		// header matches the request URL origin (but not `paths.origin`) must be blocked.
		assert.equal(
			is_csrf_forbidden({
				request: form_post({
					headers: {
						'content-type': 'application/x-www-form-urlencoded',
						origin: 'http://localhost:4173'
					}
				}),
				request_origin: 'http://localhost:4173',
				self_origin: 'http://configured-origin.test',
				trusted_origins: []
			}),
			true
		);
	});

	test('allows a form submission whose origin matches the self-origin', () => {
		assert.equal(
			is_csrf_forbidden({
				request: form_post({
					headers: {
						'content-type': 'application/x-www-form-urlencoded',
						origin: 'http://configured-origin.test'
					}
				}),
				request_origin: 'http://configured-origin.test',
				self_origin: 'http://configured-origin.test',
				trusted_origins: []
			}),
			false
		);
	});

	test('allows a foreign origin listed in trusted_origins', () => {
		assert.equal(
			is_csrf_forbidden({
				request: form_post({
					headers: {
						'content-type': 'application/x-www-form-urlencoded',
						origin: 'https://trusted.example.com'
					}
				}),
				request_origin: 'https://trusted.example.com',
				self_origin: 'http://self.test',
				trusted_origins: ['https://trusted.example.com']
			}),
			false
		);
	});

	test('forbids a request with no origin header', () => {
		assert.equal(
			is_csrf_forbidden({
				request: form_post(),
				request_origin: null,
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			true
		);
	});

	test('allows GET requests regardless of origin', () => {
		assert.equal(
			is_csrf_forbidden({
				request: new Request('http://self.test/csrf', {
					method: 'GET',
					headers: { origin: 'https://malicious.test' }
				}),
				request_origin: 'https://malicious.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			false
		);
	});

	test('allows non-form content types regardless of origin', () => {
		assert.equal(
			is_csrf_forbidden({
				request: new Request('http://self.test/csrf', {
					method: 'POST',
					headers: { 'content-type': 'application/json', origin: 'https://malicious.test' }
				}),
				request_origin: 'https://malicious.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			false
		);
	});

	test.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
		'forbids %s with a foreign origin and form content type',
		(method) => {
			assert.equal(
				is_csrf_forbidden({
					request: new Request('http://self.test/csrf', {
						method,
						headers: { 'content-type': 'multipart/form-data', origin: 'https://malicious.test' }
					}),
					request_origin: 'https://malicious.test',
					self_origin: 'http://self.test',
					trusted_origins: []
				}),
				true
			);
		}
	);

	test.each(['HEAD', 'OPTIONS'])(
		'allows %s even with a foreign origin and form content type',
		(method) => {
			assert.equal(
				is_csrf_forbidden({
					request: new Request('http://self.test/csrf', {
						method,
						headers: {
							'content-type': 'application/x-www-form-urlencoded',
							origin: 'https://malicious.test'
						}
					}),
					request_origin: 'https://malicious.test',
					self_origin: 'http://self.test',
					trusted_origins: []
				}),
				false
			);
		}
	);
});

describe('is_remote_forbidden', () => {
	/** @param {RequestInit & { method?: string; headers?: Record<string, string> }} init */
	const remote_call = (init = {}) =>
		new Request('http://self.test/_app/remote/foo/bar', {
			method: 'POST',
			// remote functions accept JSON, not form content — the content-type must not
			// influence the decision (unlike form CSRF)
			headers: { 'content-type': 'application/json' },
			...init
		});

	test('forbids a non-GET remote call whose origin differs from the self-origin', () => {
		assert.equal(
			is_remote_forbidden({
				request: remote_call({
					headers: { 'content-type': 'application/json', origin: 'https://malicious.test' }
				}),
				request_origin: 'https://malicious.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			true
		);
	});

	test('forbids a remote call whose origin matches the request URL origin but not paths.origin', () => {
		// The `paths.origin` override applies identically to remote functions: a request
		// whose `origin` header matches the request URL origin (but not the configured
		// `paths.origin`) must be blocked.
		assert.equal(
			is_remote_forbidden({
				request: remote_call({
					headers: { 'content-type': 'application/json', origin: 'http://localhost:4173' }
				}),
				request_origin: 'http://localhost:4173',
				self_origin: 'http://configured-origin.test',
				trusted_origins: []
			}),
			true
		);
	});

	test('allows a non-GET remote call whose origin matches the self-origin', () => {
		assert.equal(
			is_remote_forbidden({
				request: remote_call({
					headers: { 'content-type': 'application/json', origin: 'http://self.test' }
				}),
				request_origin: 'http://self.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			false
		);
	});

	test('allows a non-GET remote call from an origin listed in trusted_origins', () => {
		// Trusted third-party services (e.g. payment gateways in `csrf.trustedOrigins`)
		// may call remote functions, just as they may submit forms. Banning them
		// unconditionally would break the documented `trustedOrigins` use case.
		assert.equal(
			is_remote_forbidden({
				request: remote_call({
					headers: { 'content-type': 'application/json', origin: 'https://checkout.stripe.com' }
				}),
				request_origin: 'https://checkout.stripe.com',
				self_origin: 'http://self.test',
				trusted_origins: ['https://checkout.stripe.com']
			}),
			false
		);
	});

	test('forbids a remote call from an origin not in trusted_origins', () => {
		assert.equal(
			is_remote_forbidden({
				request: remote_call({
					headers: { 'content-type': 'application/json', origin: 'https://evil.test' }
				}),
				request_origin: 'https://evil.test',
				self_origin: 'http://self.test',
				trusted_origins: ['https://checkout.stripe.com']
			}),
			true
		);
	});

	test('forbids a remote call with no origin header', () => {
		assert.equal(
			is_remote_forbidden({
				request: remote_call(),
				request_origin: null,
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			true
		);
	});

	test('allows GET remote calls regardless of origin', () => {
		assert.equal(
			is_remote_forbidden({
				request: new Request('http://self.test/_app/remote/foo/bar', {
					method: 'GET',
					headers: { origin: 'https://malicious.test' }
				}),
				request_origin: 'https://malicious.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			false
		);
	});

	test('does not gate on form content type — forbids a JSON remote call with a foreign origin', () => {
		// Unlike `is_csrf_forbidden`, remote-function protection applies regardless of
		// content type, since remote functions accept `application/json` (and others).
		assert.equal(
			is_remote_forbidden({
				request: remote_call({
					headers: { 'content-type': 'application/json', origin: 'https://malicious.test' }
				}),
				request_origin: 'https://malicious.test',
				self_origin: 'http://self.test',
				trusted_origins: []
			}),
			true
		);
	});

	test.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
		'forbids %s remote calls with a foreign origin',
		(method) => {
			assert.equal(
				is_remote_forbidden({
					request: remote_call({
						method,
						headers: { 'content-type': 'application/json', origin: 'https://malicious.test' }
					}),
					request_origin: 'https://malicious.test',
					self_origin: 'http://self.test',
					trusted_origins: []
				}),
				true
			);
		}
	);
});
