import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { validate_config, load_config } from './index.js';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * mutates and remove keys from an object when check callback returns true
 * @param {Record<string, any>} o any object
 * @param {([key, value]: [string, any]) => boolean} check callback with access
 * 		to the key-value pair and returns a boolean that decides the deletion of key
 */
function remove_keys(o, check) {
	for (const key in o) {
		if (!Object.hasOwnProperty.call(o, key)) continue;
		if (check([key, o[key]])) delete o[key];
		const nested = typeof o[key] === 'object' && !Array.isArray(o[key]);
		if (nested) remove_keys(o[key], check);
	}
}

const directive_defaults = {
	'child-src': undefined,
	'default-src': undefined,
	'frame-src': undefined,
	'worker-src': undefined,
	'connect-src': undefined,
	'font-src': undefined,
	'img-src': undefined,
	'manifest-src': undefined,
	'media-src': undefined,
	'object-src': undefined,
	'prefetch-src': undefined,
	'script-src': undefined,
	'script-src-elem': undefined,
	'script-src-attr': undefined,
	'style-src': undefined,
	'style-src-elem': undefined,
	'style-src-attr': undefined,
	'base-uri': undefined,
	sandbox: undefined,
	'form-action': undefined,
	'frame-ancestors': undefined,
	'navigate-to': undefined,
	'report-uri': undefined,
	'report-to': undefined,
	'require-trusted-types-for': undefined,
	'trusted-types': undefined,
	'upgrade-insecure-requests': false,
	'require-sri-for': undefined,
	'block-all-mixed-content': false,
	'plugin-types': undefined,
	referrer: undefined
};

const get_defaults = (prefix = '') => ({
	extensions: ['.svelte'],
	kit: {
		adapter: null,
		alias: {},
		appDir: '_app',
		csp: {
			mode: 'auto',
			directives: directive_defaults,
			reportOnly: directive_defaults
		},
		csrf: {
			checkOrigin: true
		},
		embedded: false,
		env: {
			dir: process.cwd(),
			publicPrefix: 'PUBLIC_',
			privatePrefix: ''
		},
		experimental: {
			remoteFunctions: false
		},
		files: {
			assets: join(prefix, 'static'),
			hooks: {
				client: join(prefix, 'src/hooks.client'),
				server: join(prefix, 'src/hooks.server'),
				universal: join(prefix, 'src/hooks')
			},
			lib: join(prefix, 'src/lib'),
			params: join(prefix, 'src/params'),
			routes: join(prefix, 'src/routes'),
			serviceWorker: join(prefix, 'src/service-worker'),
			appTemplate: join(prefix, 'src/app.html'),
			errorTemplate: join(prefix, 'src/error.html')
		},
		inlineStyleThreshold: 0,
		moduleExtensions: ['.js', '.ts'],
		output: { preloadStrategy: 'modulepreload', bundleStrategy: 'split' },
		outDir: join(prefix, '.svelte-kit'),
		router: {
			type: 'pathname',
			resolution: 'client'
		},
		serviceWorker: {
			register: true
		},
		typescript: {},
		paths: {
			base: '',
			assets: '',
			relative: true
		},
		prerender: {
			concurrency: 1,
			crawl: true,
			entries: ['*'],
			origin: 'http://sveltekit-prerender'
		},
		version: {
			name: Date.now().toString(),
			pollInterval: 0
		}
	}
});

test('fills in defaults', async () => {
	const validated = await validate_config(() => Promise.resolve({}));

	assert.equal(validated.kit.serviceWorker.files(''), true);

	remove_keys(validated, ([, v]) => typeof v === 'function');

	const defaults = get_defaults();
	defaults.kit.version.name = validated.kit.version.name;

	expect(validated).toEqual(defaults);
});

test('errors on invalid values', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			// @ts-expect-error - given value expected to throw
			Promise.resolve({
				kit: {
					appDir: 42
				}
			})
		)
	).rejects.toThrow(/^config\.kit\.appDir should be a string, if specified$/);
});

test('errors on invalid nested values', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			// @ts-expect-error - given value expected to throw
			Promise.resolve({
				kit: {
					files: {
						potato: 42
					}
				}
			})
		)
	).rejects.toThrow(/^Unexpected option config\.kit\.files\.potato$/);
});

test('does not error on invalid top-level values', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				onwarn: () => {}
			})
		)
	).resolves.not.toThrow();
});

test('errors on extension without leading .', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				extensions: ['blah']
			})
		)
	).rejects.toThrow(/Each member of config\.extensions must start with '\.' — saw 'blah'/);
});

test('fills in partial blanks', async () => {
	const validated = await validate_config(() =>
		Promise.resolve({
			kit: {
				files: {
					assets: 'public'
				},
				version: {
					name: '0'
				}
			}
		})
	);

	assert.equal(validated.kit.serviceWorker.files(''), true);

	remove_keys(validated, ([, v]) => typeof v === 'function');

	const config = get_defaults();
	config.kit.files.assets = 'public';
	config.kit.version.name = '0';

	expect(validated).toEqual(config);
});

test('fails if kit.appDir is blank', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				kit: {
					appDir: ''
				}
			})
		)
	).rejects.toThrow(/^config\.kit\.appDir cannot be empty$/);
});

test('fails if kit.appDir is only slash', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				kit: {
					appDir: '/'
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/svelte\.dev\/docs\/kit\/configuration$/
	);
});

test('fails if kit.appDir starts with slash', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				kit: {
					appDir: '/_app'
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/svelte\.dev\/docs\/kit\/configuration$/
	);
});

test('fails if kit.appDir ends with slash', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				kit: {
					appDir: '_app/'
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/svelte\.dev\/docs\/kit\/configuration$/
	);
});

test('fails if paths.base is not root-relative', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			// @ts-expect-error
			Promise.resolve({
				kit: {
					paths: {
						base: 'https://example.com/somewhere/else'
					}
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.paths\.base option must either be the empty string or a root-relative path that starts but doesn't end with '\/'. See https:\/\/svelte\.dev\/docs\/kit\/configuration#paths$/
	);
});

test("fails if paths.base ends with '/'", () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				kit: {
					paths: {
						base: '/github-pages/'
					}
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.paths\.base option must either be the empty string or a root-relative path that starts but doesn't end with '\/'. See https:\/\/svelte\.dev\/docs\/kit\/configuration#paths$/
	);
});

test('fails if paths.assets is relative', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			// @ts-expect-error
			Promise.resolve({
				kit: {
					paths: {
						assets: 'foo'
					}
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.paths\.assets option must be an absolute path, if specified. See https:\/\/svelte\.dev\/docs\/kit\/configuration#paths$/
	);
});

test('fails if paths.assets has trailing slash', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			Promise.resolve({
				kit: {
					paths: {
						assets: 'https://cdn.example.com/stuff/'
					}
				}
			})
		)
	).rejects.toThrow(
		/^config\.kit\.paths\.assets option must not end with '\/'. See https:\/\/svelte\.dev\/docs\/kit\/configuration#paths$/
	);
});

test('fails if prerender.entries are invalid', () => {
	expect(
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validate_config(() =>
			// @ts-expect-error - given value expected to throw
			Promise.resolve({
				kit: {
					prerender: {
						entries: ['foo']
					}
				}
			})
		)
	).rejects.toThrow(
		/^Each member of config\.kit.prerender.entries must be either '\*' or an absolute path beginning with '\/' — saw 'foo'$/
	);
});

/**
 * @param {string} name
 * @param {import('@sveltejs/kit').KitConfig['paths']} input
 * @param {import('@sveltejs/kit').KitConfig['paths']} output
 */
function validate_paths(name, input, output) {
	test(name, async () => {
		expect(
			(
				await validate_config(() =>
					Promise.resolve({
						kit: {
							paths: input
						}
					})
				)
			).kit.paths
		).toEqual(output);
	});
}

validate_paths(
	'empty assets relative to base path',
	{
		base: '/path/to/base'
	},
	{
		base: '/path/to/base',
		assets: '',
		relative: true
	}
);

validate_paths(
	'external assets',
	{
		assets: 'https://cdn.example.com'
	},
	{
		base: '',
		assets: 'https://cdn.example.com',
		relative: true
	}
);

validate_paths(
	'external assets with base',
	{
		base: '/path/to/base',
		assets: 'https://cdn.example.com'
	},
	{
		base: '/path/to/base',
		assets: 'https://cdn.example.com',
		relative: true
	}
);

test('load default config (esm)', async () => {
	const cwd = join(__dirname, 'fixtures/default');

	const config = await load_config({ cwd });
	remove_keys(config, ([, v]) => typeof v === 'function');

	const defaults = get_defaults(cwd + '/');
	defaults.kit.version.name = config.kit.version.name;

	expect(config).toEqual(defaults);
});

test('load default config (esm) with .ts extensions', async () => {
	const cwd = join(__dirname, 'fixtures/typescript');

	const config = await load_config({ cwd });
	remove_keys(config, ([, v]) => typeof v === 'function');

	const defaults = get_defaults(cwd + '/');
	defaults.kit.version.name = config.kit.version.name;

	expect(config).toEqual(defaults);
});

test('load .js config when both .js and .ts configs are present', async () => {
	const cwd = join(__dirname, 'fixtures/multiple');

	const config = await load_config({ cwd });
	remove_keys(config, ([, v]) => typeof v === 'function');

	const defaults = get_defaults(cwd + '/');
	defaults.kit.version.name = config.kit.version.name;

	expect(config).toEqual(defaults);
});

test('errors on loading config with incorrect default export', async () => {
	let message = null;

	try {
		const cwd = join(__dirname, 'fixtures', 'export-string');
		await load_config({ cwd });
	} catch (/** @type {any} */ e) {
		message = e.message;
	}

	assert.equal(
		message,
		'The Svelte config file must have a configuration object as its default export. See https://svelte.dev/docs/kit/configuration'
	);
});

test('errors on non-deterministic version name', async () => {
	let message = null;

	try {
		const cwd = join(__dirname, 'fixtures', 'non-deterministic-version');
		await load_config({ cwd });
	} catch (/** @type {any} */ e) {
		message = e.message;
	}

	assert.equal(
		message,
		'The `version.name` option must be deterministic (e.g. a commit ref rather than` Math.random()` or `Date.now().toString()`). See https://svelte.dev/docs/kit/configuration#version'
	);
});
