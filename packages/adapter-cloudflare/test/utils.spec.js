import { expect, test } from 'vitest';
import { get_routes_json, parse_redirects } from '../utils.js';

test('parse_redirects for _redirects file', () => {
	const redirects = parse_redirects(
		`
/home301 / 301
/notrailing/ /nottrailing 301

/blog/* https://blog.my.domain/:splat
`.trim()
	);

	expect(redirects).toEqual(['/home301', '/notrailing/', '/blog/*']);
});

test('get_routes_json for generated _routes.json file', () => {
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
						checkOrigin: true
					},
					embedded: false,
					files: {
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

test('get_routes_json truncates excess exclude rules', () => {
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
						checkOrigin: true
					},
					embedded: false,
					files: {
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
