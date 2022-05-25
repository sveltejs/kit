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
			directives: {},
			reportOnly: {}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	assert.equal(csp.get_header(), '');
	assert.equal(csp.get_report_only_header(), '');
});

test('generates CSP header with directive', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {
				'default-src': ['self']
			},
			reportOnly: {
				'default-src': ['self'],
				'report-uri': ['/']
			}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: false
		}
	);

	assert.equal(csp.get_header(), "default-src 'self'");
	assert.equal(csp.get_report_only_header(), "default-src 'self'; report-uri /");
});

test('generates CSP header with nonce', () => {
	const csp = new Csp(
		{
			mode: 'nonce',
			directives: {
				'default-src': ['self']
			},
			reportOnly: {
				'default-src': ['self'],
				'report-uri': ['/']
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
	assert.ok(
		csp
			.get_report_only_header()
			.startsWith("default-src 'self'; report-uri /; script-src 'self' 'nonce-")
	);
});

test('skips nonce with unsafe-inline', () => {
	const csp = new Csp(
		{
			mode: 'nonce',
			directives: {
				'default-src': ['unsafe-inline']
			},
			reportOnly: {
				'default-src': ['unsafe-inline'],
				'report-uri': ['/']
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
	assert.equal(csp.get_report_only_header(), "default-src 'unsafe-inline'; report-uri /");
});

test('skips hash with unsafe-inline', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {
				'default-src': ['unsafe-inline']
			},
			reportOnly: {
				'default-src': ['unsafe-inline'],
				'report-uri': ['/']
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
	assert.equal(csp.get_report_only_header(), "default-src 'unsafe-inline'; report-uri /");
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
			},
			reportOnly: {}
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
			},
			reportOnly: {
				'default-src': ['self'],
				'report-uri': ['/']
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

	assert.equal(
		csp.get_report_only_header(),
		"default-src 'self'; report-uri /; style-src 'self' 'unsafe-inline'"
	);
});

test.skip('removes strict-dynamic in dev', () => {
	['default-src', 'script-src'].forEach((name) => {
		const csp = new Csp(
			{
				mode: 'hash',
				directives: {
					[name]: ['strict-dynamic']
				},
				reportOnly: {
					[name]: ['strict-dynamic'],
					'report-uri': ['/']
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
		assert.equal(csp.get_report_only_header(), '');
	});
});

test('uses hashes when prerendering', () => {
	const csp = new Csp(
		{
			mode: 'auto',
			directives: {
				'script-src': ['self']
			},
			reportOnly: {
				'script-src': ['self'],
				'report-uri': ['/']
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

	assert.equal(
		csp.get_report_only_header(),
		"script-src 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='; report-uri /"
	);
});

test('always creates a nonce when template needs it', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {},
			reportOnly: {}
		},
		{
			dev: false,
			prerender: false,
			needs_nonce: true
		}
	);

	assert.ok(csp.nonce);
	assert.ok(csp.report_only_nonce);
});

test('throws when reportOnly contains directives but no report-uri or report-to', () => {
	assert.throws(() => {
		new Csp(
			{
				mode: 'hash',
				directives: {},
				reportOnly: {
					'script-src': ['self']
				}
			},
			{
				dev: false,
				prerender: false,
				needs_nonce: true
			}
		);
	}, '`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both');
});

test.run();
