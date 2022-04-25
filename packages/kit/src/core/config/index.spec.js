import { join } from 'path';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { remove_keys } from '../../utils/object.js';
import { validate_config, load_config } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const get_defaults = (prefix = '') => ({
	extensions: ['.svelte'],
	kit: {
		adapter: null,
		amp: false,
		appDir: '_app',
		browser: {
			hydrate: true,
			router: true
		},
		csp: {
			mode: 'auto',
			directives: {
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
			}
		},
		endpointExtensions: ['.js', '.ts'],
		files: {
			assets: join(prefix, 'static'),
			hooks: join(prefix, 'src/hooks'),
			lib: join(prefix, 'src/lib'),
			params: join(prefix, 'src/params'),
			routes: join(prefix, 'src/routes'),
			serviceWorker: join(prefix, 'src/service-worker'),
			template: join(prefix, 'src/app.html')
		},
		floc: false,
		headers: undefined,
		host: undefined,
		hydrate: undefined,
		inlineStyleThreshold: 0,
		methodOverride: {
			parameter: '_method',
			allowed: []
		},
		outDir: join(prefix, '.svelte-kit'),
		package: {
			dir: 'package',
			emitTypes: true
		},
		serviceWorker: {
			register: true
		},
		paths: {
			base: '',
			assets: ''
		},
		prerender: {
			concurrency: 1,
			crawl: true,
			createIndexFiles: undefined,
			default: false,
			enabled: true,
			entries: ['*'],
			force: undefined,
			onError: 'fail',
			pages: undefined
		},
		protocol: undefined,
		router: undefined,
		ssr: undefined,
		target: undefined,
		trailingSlash: 'never',
		version: {
			name: Date.now().toString(),
			pollInterval: 0
		}
	}
});

test('fills in defaults', () => {
	const validated = validate_config({});

	assert.equal(validated.kit.package.exports(''), true);
	assert.equal(validated.kit.package.files(''), true);
	assert.equal(validated.kit.serviceWorker.files(''), true);
	assert.equal(validated.kit.vite(), {});

	remove_keys(validated, ([, v]) => typeof v === 'function');

	const defaults = get_defaults();
	defaults.kit.version.name = validated.kit.version.name;

	assert.equal(validated, defaults);
});

test('errors on invalid values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				// @ts-expect-error - given value expected to throw
				appDir: 42
			}
		});
	}, /^config\.kit\.appDir should be a string, if specified$/);
});

test('errors on invalid nested values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				files: {
					// @ts-expect-error - given value expected to throw
					potato: 'blah'
				}
			}
		});
	}, /^Unexpected option config\.kit\.files\.potato$/);
});

test('does not error on invalid top-level values', () => {
	assert.not.throws(() => {
		validate_config({
			// @ts-expect-error - valid option for others but not in our definition
			onwarn: () => {}
		});
	});
});

test('errors on extension without leading .', () => {
	assert.throws(() => {
		validate_config({
			extensions: ['blah']
		});
	}, /Each member of config\.extensions must start with '\.' — saw 'blah'/);
});

test('fills in partial blanks', () => {
	const validated = validate_config({
		kit: {
			files: {
				assets: 'public'
			},
			version: {
				name: '0'
			}
		}
	});

	assert.equal(validated.kit.package.exports(''), true);
	assert.equal(validated.kit.package.files(''), true);
	assert.equal(validated.kit.serviceWorker.files(''), true);
	assert.equal(validated.kit.vite(), {});

	remove_keys(validated, ([, v]) => typeof v === 'function');

	const config = get_defaults();
	config.kit.files.assets = 'public';
	config.kit.version.name = '0';

	assert.equal(validated, config);
});

test('fails if kit.appDir is blank', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: ''
			}
		});
	}, /^config\.kit\.appDir cannot be empty$/);
});

test('fails if kit.appDir is only slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/'
			}
		});
	}, /^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs\/configuration$/);
});

test('fails if kit.appDir starts with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/_app'
			}
		});
	}, /^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs\/configuration$/);
});

test('fails if kit.appDir ends with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '_app/'
			}
		});
	}, /^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs\/configuration$/);
});

test('fails if paths.base is not root-relative', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				paths: {
					base: 'https://example.com/somewhere/else'
				}
			}
		});
	}, /^config\.kit\.paths\.base option must either be the empty string or a root-relative path that starts but doesn't end with '\/'. See https:\/\/kit\.svelte\.dev\/docs\/configuration#paths$/);
});

test("fails if paths.base ends with '/'", () => {
	assert.throws(() => {
		validate_config({
			kit: {
				paths: {
					base: '/github-pages/'
				}
			}
		});
	}, /^config\.kit\.paths\.base option must either be the empty string or a root-relative path that starts but doesn't end with '\/'. See https:\/\/kit\.svelte\.dev\/docs\/configuration#paths$/);
});

test('fails if paths.assets is relative', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				paths: {
					assets: 'foo'
				}
			}
		});
	}, /^config\.kit\.paths\.assets option must be an absolute path, if specified. See https:\/\/kit\.svelte\.dev\/docs\/configuration#paths$/);
});

test('fails if paths.assets has trailing slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				paths: {
					assets: 'https://cdn.example.com/stuff/'
				}
			}
		});
	}, /^config\.kit\.paths\.assets option must not end with '\/'. See https:\/\/kit\.svelte\.dev\/docs\/configuration#paths$/);
});

test('fails if prerender.entries are invalid', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				prerender: {
					entries: ['foo']
				}
			}
		});
	}, /^Each member of config\.kit.prerender.entries must be either '\*' or an absolute path beginning with '\/' — saw 'foo'$/);
});

/**
 * @param {string} name
 * @param {{ base?: string, assets?: string }} input
 * @param {{ base?: string, assets?: string }} output
 */
function validate_paths(name, input, output) {
	test(name, () => {
		assert.equal(
			validate_config({
				kit: {
					paths: input
				}
			}).kit.paths,
			output
		);
	});
}

validate_paths(
	'empty assets relative to base path',
	{
		base: '/path/to/base'
	},
	{
		base: '/path/to/base',
		assets: ''
	}
);

validate_paths(
	'external assets',
	{
		assets: 'https://cdn.example.com'
	},
	{
		base: '',
		assets: 'https://cdn.example.com'
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
		assets: 'https://cdn.example.com'
	}
);

test('load default config (esm)', async () => {
	const cwd = join(__dirname, 'fixtures/default');

	const config = await load_config({ cwd });
	remove_keys(config, ([, v]) => typeof v === 'function');

	const defaults = get_defaults(cwd + '/');
	defaults.kit.version.name = config.kit.version.name;

	assert.equal(config, defaults);
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
		'svelte.config.js must have a configuration object as its default export. See https://kit.svelte.dev/docs/configuration'
	);
});

test.run();
