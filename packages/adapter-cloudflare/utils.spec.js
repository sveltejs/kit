import { describe, test, vi, expect } from 'vitest';
import {
	is_building_for_cloudflare_pages,
	validate_worker_settings,
	get_routes_json,
	generate_headers,
	parse_headers,
	parse_redirects,
	strip_headers_rules
} from './utils.js';

describe('detects Cloudflare Pages project', () => {
	test('by default', () => {
		expect(
			is_building_for_cloudflare_pages(/** @type {import('wrangler').Unstable_Config} */ ({}))
		).toBe(true);
	});

	test('CF_PAGES environment variable', () => {
		vi.stubEnv('CF_PAGES', '1');
		const result = is_building_for_cloudflare_pages(
			/** @type {import('wrangler').Unstable_Config} */ ({})
		);
		vi.unstubAllEnvs();
		expect(result).toBe(true);
	});

	test('empty Wrangler configuration file', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc'
				})
			)
		).toBe(true);
	});

	test('pages_build_output_dir config key', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					pages_build_output_dir: 'dist'
				})
			)
		).toBe(true);
	});
});

describe('detects Cloudflare Workers project', () => {
	test('main config key', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js'
				})
			)
		).toBe(false);
	});

	test('assets config key', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					assets: {
						directory: 'dist/assets'
					}
				})
			)
		).toBe(false);
	});
});

describe('validates Wrangler config', () => {
	test('Worker and static assets', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js',
					assets: {
						directory: 'dist/assets',
						binding: 'ASSETS'
					}
				})
			)
		).not.toThrow();
	});

	test('static assets only', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					assets: {
						directory: 'dist/assets'
					}
				})
			)
		).not.toThrow();
	});

	test('missing `assets.directory` key', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js',
					assets: {
						binding: 'ASSETS'
					}
				})
			)
		).toThrow(
			`You must specify the \`assets.directory\` key in wrangler.jsonc. Consult https://developers.cloudflare.com/workers/static-assets/binding/#directory`
		);
	});

	test('missing `assets.binding` key', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js',
					assets: {
						directory: 'dist/assets'
					}
				})
			)
		).toThrow(
			`You must specify the \`assets.binding\` key in wrangler.jsonc before deploying your Worker. Consult https://developers.cloudflare.com/workers/static-assets/binding/#binding`
		);
	});

	test('missing `main` key or should remove `assets.binding` key', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					assets: {
						directory: 'dist/assets',
						binding: 'ASSETS'
					}
				})
			)
		).toThrow(
			`You must specify the \`main\` key in wrangler.jsonc if you want to deploy a Worker alongside your static assets. Otherwise, remove the \`assets.binding\` key if you only want to deploy static assets.`
		);
	});
});

test('ignores comments in _redirects file', () => {
	const redirects = parse_redirects(
		`
# This is a comment
/home301 / 301
  # Indented comment
/blog/* https://blog.my.domain/:splat
`.trim()
	);

	expect(redirects).toEqual(['/home301', '/blog/*']);
});

test('parses _redirects file', () => {
	const redirects = parse_redirects(
		`
/home301 / 301
/notrailing/ /nottrailing 301

/blog/* https://blog.my.domain/:splat
`.trim()
	);

	expect(redirects).toEqual(['/home301', '/notrailing/', '/blog/*']);
});

test('parses a _headers file and ignores comments', () => {
	const headers = parse_headers(
		`
# This is a comment
/_app/immutable/*
  Cross-Origin-Embedder-Policy: require-corp
	# Indented comment
	X-Custom: value
/about
  X-Robots-Tag: noindex
`.trim()
	);

	expect(headers).toEqual(
		new Map([
			['/_app/immutable/*', ['Cross-Origin-Embedder-Policy: require-corp', 'X-Custom: value']],
			['/about', ['X-Robots-Tag: noindex']]
		])
	);
});

test('merges repeated path patterns in a _headers file', () => {
	const headers = parse_headers(
		`
/_app/immutable/*
  Cross-Origin-Embedder-Policy: require-corp
/_app/immutable/*
  X-Custom: value
`.trim()
	);

	expect(headers).toEqual(
		new Map([
			['/_app/immutable/*', ['Cross-Origin-Embedder-Policy: require-corp', 'X-Custom: value']]
		])
	);
});

test('strips the given rules while leaving other rules and comments intact', () => {
	const stripped = strip_headers_rules(
		`# top comment
/_app/*
  X-Custom: app
/_app/immutable/*
  Cross-Origin-Embedder-Policy: require-corp

/about
  X-Robots-Tag: noindex
`,
		new Set(['/_app/*', '/_app/immutable/*'])
	);

	expect(stripped.trim()).toBe(
		`# top comment

/about
  X-Robots-Tag: noindex`
	);
});

test('generates immutable headers without a user _headers file', () => {
	expect(generate_headers('_app')).toBe(
		`# === START AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
/_app/*
\t! X-Robots-Tag
\tX-Robots-Tag: noindex
\t! Cache-Control
\tCache-Control: no-cache
/_app/immutable/*
\t! Cache-Control
\tCache-Control: public, immutable, max-age=31536000
# === END AUTOGENERATED SVELTE IMMUTABLE HEADERS ===`
	);
});

test('merges colliding user headers into the autogenerated section and removes duplicate blocks', () => {
	const generated = generate_headers(
		'_app',
		`/about
  X-Robots-Tag: noindex
/_app/immutable/*
  Cross-Origin-Embedder-Policy: require-corp
  Cache-Control: max-age=1
`
	);

	expect(generated).toBe(
		`/about
  X-Robots-Tag: noindex
# === START AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
/_app/*
\t! X-Robots-Tag
\tX-Robots-Tag: noindex
\t! Cache-Control
\tCache-Control: no-cache
/_app/immutable/*
\tCross-Origin-Embedder-Policy: require-corp
\tCache-Control: max-age=1
\t! Cache-Control
\tCache-Control: public, immutable, max-age=31536000
# === END AUTOGENERATED SVELTE IMMUTABLE HEADERS ===`
	);
});

test('generates a _routes.json file', () => {
	const routes = get_routes_json(
		{
			getAppPath: () => 'base-path/_app',
			config: {
				kit: {
					appDir: '_app',
					paths: {
						base: '/base-path',
						assets: '',
						relative: true
					},
					alias: {},
					csrf: {
						checkOrigin: true,
						trustedOrigins: []
					},
					embedded: false,
					files: {
						src: 'src',
						assets: 'static',
						hooks: {
							client: 'src/hooks.client.js',
							server: 'src/hooks.server.js',
							universal: 'src/hooks.js'
						},
						lib: 'src/lib',
						params: 'src/params',
						routes: 'src/routes',
						serviceWorker: 'src/service-worker.js',
						appTemplate: 'src/app.html',
						errorTemplate: 'src/error.html'
					},
					inlineStyleThreshold: 0,
					moduleExtensions: ['.js', '.ts'],
					csp: {
						mode: 'auto',
						// @ts-ignore
						directives: {},
						// @ts-ignore
						reportOnly: {}
					},
					env: {
						dir: '.',
						publicPrefix: 'PUBLIC_',
						privatePrefix: ''
					},
					outDir: '.svelte-kit'
				}
			},
			prerendered: {
				paths: ['/base-path/prerendered'],
				pages: new Map(),
				assets: new Map(),
				redirects: new Map()
			}
		},
		['_app/immutable/this-should-not-be-excluded.js', 'robots.txt'],
		['/base-path/redirect'],
		undefined
	);

	expect(routes).toEqual({
		version: 1,
		description: 'Generated by @sveltejs/adapter-cloudflare',
		include: ['/*'],
		exclude: [
			'/base-path/_app/version.json',
			'/base-path/_app/immutable/*',
			'/base-path/robots.txt',
			'/base-path/prerendered',
			'/base-path/redirect'
		]
	});
});

test('truncates excess _routes.json exclude rules', () => {
	const routes = get_routes_json(
		{
			// @ts-ignore
			log: {
				warn: console.warn
			},
			getAppPath: () => 'base-path/_app',
			config: {
				kit: {
					appDir: '_app',
					paths: {
						base: '/base-path',
						assets: '',
						relative: true
					},
					alias: {},
					csrf: {
						checkOrigin: true,
						trustedOrigins: []
					},
					embedded: false,
					files: {
						src: 'src',
						assets: 'static',
						hooks: {
							client: 'src/hooks.client.js',
							server: 'src/hooks.server.js',
							universal: 'src/hooks.js'
						},
						lib: 'src/lib',
						params: 'src/params',
						routes: 'src/routes',
						serviceWorker: 'src/service-worker.js',
						appTemplate: 'src/app.html',
						errorTemplate: 'src/error.html'
					},
					inlineStyleThreshold: 0,
					moduleExtensions: ['.js', '.ts'],
					csp: {
						mode: 'auto',
						// @ts-ignore
						directives: {},
						// @ts-ignore
						reportOnly: {}
					},
					env: {
						dir: '.',
						publicPrefix: 'PUBLIC_',
						privatePrefix: ''
					},
					outDir: '.svelte-kit'
				}
			},
			prerendered: {
				paths: Array.from({ length: 100 }, (_, i) => `/base-path/blog/post/${i + 1}`),
				pages: new Map(),
				assets: new Map(),
				redirects: new Map()
			}
		},
		['_app/immutable/this-should-not-be-excluded.js', 'robots.txt'],
		[],
		undefined
	);

	expect(routes).toEqual({
		version: 1,
		description: 'Generated by @sveltejs/adapter-cloudflare',
		include: ['/*'],
		exclude: [
			'/base-path/_app/version.json',
			'/base-path/_app/immutable/*',
			'/base-path/robots.txt'
		].concat(Array.from({ length: 96 }, (_, i) => `/base-path/blog/post/${i + 1}`))
	});
});
