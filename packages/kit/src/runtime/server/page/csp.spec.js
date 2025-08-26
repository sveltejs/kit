import process from 'node:process';
import { webcrypto } from 'node:crypto';
import { assert, test, describe } from 'vitest';
import { Csp } from './csp.js';

// TODO: remove after bumping peer dependency to require Node 20
if (!globalThis.crypto) {
	// @ts-expect-error
	globalThis.crypto = webcrypto;
}

describe.skipIf(process.env.NODE_ENV === 'production')('CSPs in dev', () => {
	test('adds unsafe-inline styles', () => {
		const csp = new Csp(
			{
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'style-src-attr': ['self', 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc='],
					'style-src-elem': ['self', 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=']
				},
				reportOnly: {
					'default-src': ['self'],
					'style-src-attr': ['self'],
					'style-src-elem': ['self'],
					'report-uri': ['/']
				}
			},
			{
				prerender: false
			}
		);

		csp.add_style('');

		assert.equal(
			csp.csp_provider.get_header(),
			"default-src 'self'; style-src-attr 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
		);

		assert.equal(
			csp.report_only_provider.get_header(),
			"default-src 'self'; style-src-attr 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; report-uri /; style-src 'self' 'unsafe-inline'"
		);
	});

	test.skip('removes strict-dynamic', () => {
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
					prerender: false
				}
			);

			csp.add_script('');

			assert.equal(csp.csp_provider.get_header(), '');
			assert.equal(csp.report_only_provider.get_header(), '');
		});
	});
});

describe.skipIf(process.env.NODE_ENV !== 'production')('CSPs in prod', () => {
	test('generates blank CSP header', () => {
		const csp = new Csp(
			{
				mode: 'hash',
				directives: {},
				reportOnly: {}
			},
			{
				prerender: false
			}
		);

		assert.equal(csp.csp_provider.get_header(), '');
		assert.equal(csp.report_only_provider.get_header(), '');
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
				prerender: false
			}
		);

		assert.equal(csp.csp_provider.get_header(), "default-src 'self'");
		assert.equal(csp.report_only_provider.get_header(), "default-src 'self'; report-uri /");
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
				prerender: false
			}
		);

		csp.add_script('');

		assert.ok(
			csp.csp_provider.get_header().startsWith("default-src 'self'; script-src 'self' 'nonce-")
		);
		assert.ok(
			csp.report_only_provider
				.get_header()
				.startsWith("default-src 'self'; report-uri /; script-src 'self' 'nonce-")
		);
	});

	test('skips nonce with unsafe-inline', () => {
		const csp = new Csp(
			{
				mode: 'nonce',
				directives: {
					'default-src': ['unsafe-inline'],
					'script-src': ['unsafe-inline'],
					'script-src-elem': ['unsafe-inline'],
					'style-src': ['unsafe-inline'],
					'style-src-attr': ['unsafe-inline'],
					'style-src-elem': ['unsafe-inline']
				},
				reportOnly: {
					'default-src': ['unsafe-inline'],
					'script-src': ['unsafe-inline'],
					'script-src-elem': ['unsafe-inline'],
					'style-src': ['unsafe-inline'],
					'style-src-attr': ['unsafe-inline'],
					'style-src-elem': ['unsafe-inline'],
					'report-uri': ['/']
				}
			},
			{
				prerender: false
			}
		);

		csp.add_script('');
		csp.add_style('');

		assert.equal(
			csp.csp_provider.get_header(),
			"default-src 'unsafe-inline'; script-src 'unsafe-inline'; script-src-elem 'unsafe-inline'; style-src 'unsafe-inline'; style-src-attr 'unsafe-inline'; style-src-elem 'unsafe-inline'"
		);
		assert.equal(
			csp.report_only_provider.get_header(),
			"default-src 'unsafe-inline'; script-src 'unsafe-inline'; script-src-elem 'unsafe-inline'; style-src 'unsafe-inline'; style-src-attr 'unsafe-inline'; style-src-elem 'unsafe-inline'; report-uri /"
		);
	});

	test('skips nonce in style-src when using unsafe-inline', () => {
		const csp = new Csp(
			{
				mode: 'nonce',
				directives: {
					'style-src': ['self', 'unsafe-inline']
				},
				reportOnly: {
					'style-src': ['self', 'unsafe-inline'],
					'report-uri': ['/']
				}
			},
			{
				prerender: false
			}
		);

		csp.add_style('');

		assert.equal(csp.csp_provider.get_header(), "style-src 'self' 'unsafe-inline'");
		assert.equal(
			csp.report_only_provider.get_header(),
			"style-src 'self' 'unsafe-inline'; report-uri /"
		);
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
				prerender: false
			}
		);

		csp.add_script('');

		assert.equal(csp.csp_provider.get_header(), "default-src 'unsafe-inline'");
		assert.equal(
			csp.report_only_provider.get_header(),
			"default-src 'unsafe-inline'; report-uri /"
		);
	});

	test('does not add empty comment hash to style-src-elem if already defined', () => {
		const csp = new Csp(
			{
				mode: 'hash',
				directives: {
					'style-src-elem': ['self', 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=']
				},
				reportOnly: {
					'report-uri': ['/']
				}
			},
			{
				prerender: false
			}
		);

		csp.add_style('/* empty */');

		assert.equal(
			csp.csp_provider.get_header(),
			"style-src-elem 'self' 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc='"
		);
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
				prerender: false
			}
		);

		assert.equal(
			csp.csp_provider.get_header(),
			"default-src 'self'; frame-ancestors 'self'; report-uri /csp-violation-report-endpoint/; sandbox allow-modals"
		);

		assert.equal(
			csp.csp_provider.get_meta(),
			'<meta http-equiv="content-security-policy" content="default-src \'self\'">'
		);
	});

	test('adds nonce style-src-attr and style-src-elem and nonce + sha to script-src-elem if necessary', () => {
		const csp = new Csp(
			{
				mode: 'auto',
				directives: {
					'script-src-elem': ['self'],
					'style-src-attr': ['self'],
					'style-src-elem': ['self']
				},
				reportOnly: {}
			},
			{
				prerender: false
			}
		);

		csp.add_script('');
		csp.add_style('');

		const csp_header = csp.csp_provider.get_header();
		assert.ok(csp_header.includes("script-src-elem 'self' 'nonce-"));
		assert.ok(csp_header.includes("style-src-attr 'self' 'nonce-"));
		assert.ok(
			csp_header.includes(
				"style-src-elem 'self' 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' 'nonce-"
			)
		);
	});

	test('adds hash to script-src-elem, style-src-attr and style-src-elem if necessary during prerendering', () => {
		const csp = new Csp(
			{
				mode: 'auto',
				directives: {
					'script-src-elem': ['self'],
					'style-src-attr': ['self'],
					'style-src-elem': ['self']
				},
				reportOnly: {}
			},
			{
				prerender: true
			}
		);

		csp.add_script('');
		csp.add_style('');

		const csp_header = csp.csp_provider.get_header();
		assert.ok(
			csp_header.includes(
				"script-src-elem 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
			)
		);
		assert.ok(
			csp_header.includes(
				"style-src-attr 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
			)
		);
		assert.ok(
			csp_header.includes(
				"style-src-elem 'self' 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
			)
		);
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
				prerender: true
			}
		);

		csp.add_script('');

		assert.equal(
			csp.csp_provider.get_header(),
			"script-src 'self' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
		);

		assert.equal(
			csp.report_only_provider.get_header(),
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
				prerender: false
			}
		);

		assert.ok(csp.nonce);
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
					prerender: false
				}
			);
		}, '`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both');
	});
});
