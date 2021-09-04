import { join } from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { create } from 'superstruct';
import { fileURLToPath } from 'url';
import { load_config } from '../index.js';
import { options_type } from '../options.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/**
 * @param {import('types/config').Config} config
 * @returns {import('types/config').ValidatedConfig}
 */
function validate_config(config) {
	const cwd = join(__dirname, 'fixtures', 'default-esm');
	return create(config, options_type({ cwd }));
}

/**
 * @param {string} path
 */
async function testLoadDefaultConfig(path) {
	const cwd = join(__dirname, 'fixtures', path);

	const config = await load_config({ cwd });

	// @ts-expect-error - can't test equality of a function
	delete config.kit.vite;

	assert.equal(config, {
		compilerOptions: null,
		extensions: ['.svelte'],
		kit: {
			adapter: null,
			amp: false,
			appDir: '_app',
			files: {
				assets: join(cwd, 'static'),
				hooks: join(cwd, 'src/hooks'),
				lib: join(cwd, 'src/lib'),
				routes: join(cwd, 'src/routes'),
				serviceWorker: join(cwd, 'src/service-worker'),
				template: join(cwd, 'src/app.html')
			},
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				exports: {
					include: ['**'],
					exclude: ['**/_*']
				},
				files: {
					include: ['**'],
					exclude: []
				},
				emitTypes: true
			},
			serviceWorker: {
				exclude: []
			},
			paths: { base: '', assets: '' },
			prerender: { crawl: true, enabled: true, force: undefined, onError: 'fail', pages: ['*'] },
			router: true,
			ssr: true,
			target: null,
			trailingSlash: 'never'
		},
		preprocess: null
	});
}

test('load default config (cjs)', async () => {
	await testLoadDefaultConfig('default-cjs');
});

test('load default config (esm)', async () => {
	await testLoadDefaultConfig('default-esm');
});

test('errors on loading config with incorrect default export', async () => {
	let errorMessage = null;
	try {
		const cwd = join(__dirname, 'fixtures', 'export-string');
		await load_config({ cwd });
	} catch (e) {
		errorMessage = e.message;
	}

	assert.equal(
		errorMessage,
		'Unexpected config type "string", make sure your default export is an object.'
	);
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
	});
});

test('errors on invalid values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				// @ts-expect-error - given value expected to throw
				target: 42
			}
		});
	});
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
	});
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
	});
});

test('fills in partial blanks', () => {
	const cwd = join(__dirname, 'fixtures', 'default-esm');

	const validated = validate_config({
		kit: {
			files: {
				assets: 'public'
			}
		}
	});

	assert.equal(validated.kit.vite(), {});

	// @ts-expect-error - can't test equality of a function
	delete validated.kit.vite;

	assert.equal(validated, {
		compilerOptions: null,
		extensions: ['.svelte'],
		kit: {
			adapter: null,
			amp: false,
			appDir: '_app',
			files: {
				assets: join(cwd, 'public'),
				hooks: join(cwd, 'src/hooks'),
				lib: join(cwd, 'src/lib'),
				routes: join(cwd, 'src/routes'),
				serviceWorker: join(cwd, 'src/service-worker'),
				template: join(cwd, 'src/app.html')
			},
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				exports: {
					include: ['**'],
					exclude: ['**/_*']
				},
				files: {
					include: ['**'],
					exclude: []
				},
				emitTypes: true
			},
			serviceWorker: {
				exclude: []
			},
			paths: {
				base: '',
				assets: ''
			},
			prerender: {
				crawl: true,
				enabled: true,
				// TODO: remove this for the 1.0 release
				force: undefined,
				onError: 'fail',
				pages: ['*']
			},
			router: true,
			ssr: true,
			target: null,
			trailingSlash: 'never'
		},
		preprocess: null
	});
});

test('fails if kit.appDir is blank', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: ''
			}
		});
	});
});

test('fails if kit.appDir is only slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/'
			}
		});
	});
});

test('fails if kit.appDir starts with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/_app'
			}
		});
	});
});

test('fails if kit.appDir ends with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '_app/'
			}
		});
	});
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
	});
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
	});
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
	});
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
	});
});

test('fails if prerender.pages are invalid', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				prerender: {
					pages: ['foo']
				}
			}
		});
	});
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

test.run();
