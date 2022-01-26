import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { Csp } from './csp.js';

test('generates blank CSP header', () => {
	const csp = new Csp(
		{
			mode: 'hash',
			directives: {}
		},
		false,
		false
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
		false,
		false
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
		false,
		false
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
		false,
		false
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
		false,
		false
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
		false,
		false
	);

	assert.equal(
		csp.get_header(),
		"default-src 'self'; frame-ancestors 'self'; report-uri /csp-violation-report-endpoint/; sandbox allow-modals"
	);

	assert.equal(
		csp.get_meta(),
		`<meta http-equiv="content-security-policy" content="default-src 'self'">`
	);
});

test.run();
