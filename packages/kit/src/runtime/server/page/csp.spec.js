import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { webcrypto } from 'crypto';
import { Csp } from './csp.js';

// @ts-expect-error
globalThis.crypto = webcrypto;

test('generates blank CSP header', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	assert.equal(csp.get_header(), '');
});

test('generates CSP header with directive', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {
				'default-src': ['self']
			}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	assert.equal(csp.get_header(), "default-src 'self'");
});

test('generates CSP header with nonce', () => {
	const csp = new Csp(
		{
			mode: 'nonce',
			directives: {
				'default-src': ['self']
			}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	csp.add_script('');

	assert.ok(csp.get_header().startsWith("default-src 'self'; script-src 'self' 'nonce-"));
});

test('skips nonce with unsafe-inline', () => {
	const csp = new Csp(
		{
			mode: 'nonce',
			directives: {
				'default-src': ['unsafe-inline']
			}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	csp.add_script('');
	csp.add_style('');

	assert.equal(csp.get_header(), "default-src 'unsafe-inline'");
});

test('skips hash with unsafe-inline', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {
				'default-src': ['unsafe-inline']
			}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	csp.add_script('');
	csp.add_style('');

	assert.equal(csp.get_header(), "default-src 'unsafe-inline'");
});

test('skips frame-ancestors, report-uri, sandbox from meta tags', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'frame-ancestors': ['self'],
				'report-uri': ['/csp-violation-report-endpoint/'],
				sandbox: ['allow-modals']
			}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	assert.equal(
		csp.get_header(),
		"default-src 'self'; frame-ancestors 'self'; report-uri /csp-violation-report-endpoint/; sandbox allow-modals"
	);

	assert.equal(
		csp.get_meta(),
		'<meta http-equiv="content-security-policy" content="default-src \'self\'">'
	);
});

test('adds unsafe-inline styles in dev', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {
				'default-src': ['self']
			}
		},
		{
			dev: true,
			prerender: false,
			needs_nonce: false
		}
	);

	csp.add_style('');

	assert.equal(csp.get_header(), "default-src 'self'; style-src 'self' 'unsafe-inline'");
});

test.skip('removes strict-dynamic in dev', () => {
	['default-src', 'script-src'].forEach((name) => {
		const csp = new Csp(
			{
				mode: 'hash',
				directives: {
					[name]: ['strict-dynamic']
				}
			},
			{
				dev: true,
				prerender: false,
				needs_nonce: false
			}
		);

		csp.add_script('');

		assert.equal(csp.get_header(), '');
	});
});

test('uses hashes when prerendering', () => {
	const csp = new Csp(
		{
			mode: 'auto',
			directives: {
				'script-src': ['self']
			}
		},
		{
			dev: false,
			prerender: true,
			needs_nonce: false
		}
	);

	csp.add_script('');

	assert.equal(
		csp.get_header(),
		"script-src 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
	);
});

test('always creates a nonce when template needs it', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: true
		}
	);

	assert.ok(csp.nonce);
});

test.run();
