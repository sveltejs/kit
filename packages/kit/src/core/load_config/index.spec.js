import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { validate_config } from './index.js';

test('fills in defaults', () => {
	const validated = validate_config({});

	delete validated.kit.vite;

	assert.equal(validated, {
		compilerOptions: null,
		extensions: ['.svelte'],
		kit: {
			adapter: [null],
			amp: false,
			appDir: '_app',
			files: {
				assets: 'static',
				hooks: 'src/hooks',
				lib: 'src/lib',
				routes: 'src/routes',
				serviceWorker: 'src/service-worker',
				setup: 'src/setup',
				template: 'src/app.html'
			},
			host: null,
			hostHeader: null,
			hydrate: true,
			paths: {
				base: '',
				assets: '/.'
			},
			prerender: {
				crawl: true,
				enabled: true,
				force: false,
				pages: ['*']
			},
			router: true,
			ssr: true,
			target: null
		},
		preprocess: null
	});
});

test('errors on invalid values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				// @ts-ignore
				target: 42
			}
		});
	}, /^config\.kit\.target should be a string, if specified$/);
});

test('errors on invalid nested values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				files: {
					// @ts-ignore
					potato: 'blah'
				}
			}
		});
	}, /^Unexpected option config\.kit\.files\.potato$/);
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
			}
		}
	});

	assert.equal(validated.kit.vite(), {});

	delete validated.kit.vite;

	assert.equal(validated, {
		compilerOptions: null,
		extensions: ['.svelte'],
		kit: {
			adapter: [null],
			amp: false,
			appDir: '_app',
			files: {
				assets: 'public',
				hooks: 'src/hooks',
				lib: 'src/lib',
				routes: 'src/routes',
				serviceWorker: 'src/service-worker',
				setup: 'src/setup',
				template: 'src/app.html'
			},
			host: null,
			hostHeader: null,
			hydrate: true,
			paths: {
				base: '',
				assets: '/.'
			},
			prerender: {
				crawl: true,
				enabled: true,
				force: false,
				pages: ['*']
			},
			router: true,
			ssr: true,
			target: null
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
	}, /^config\.kit\.appDir cannot be empty$/);
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
	}, /^config\.kit\.paths\.base must be a root-relative path$/);
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
	}, /^Each member of config\.kit.prerender.pages must be either '\*' or an absolute path beginning with '\/' — saw 'foo'$/);
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
					// @ts-ignore
					paths: input
				}
			}).kit.paths,
			output
		);
	});
}

validate_paths(
	'assets relative to empty string',
	{
		assets: 'path/to/assets'
	},
	{
		base: '',
		assets: '/path/to/assets'
	}
);

validate_paths(
	'assets relative to base path',
	{
		base: '/path/to/base',
		assets: 'path/to/assets'
	},
	{
		base: '/path/to/base',
		assets: '/path/to/base/path/to/assets'
	}
);

validate_paths(
	'empty assets relative to base path',
	{
		base: '/path/to/base'
	},
	{
		base: '/path/to/base',
		assets: '/path/to/base'
	}
);

validate_paths(
	'root-relative assets',
	{
		assets: '/path/to/assets'
	},
	{
		base: '',
		assets: '/path/to/assets'
	}
);

validate_paths(
	'root-relative assets with base path',
	{
		base: '/path/to/base',
		assets: '/path/to/assets'
	},
	{
		base: '/path/to/base',
		assets: '/path/to/assets'
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
