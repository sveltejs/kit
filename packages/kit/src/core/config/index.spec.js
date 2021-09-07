import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { validate_config } from './index.js';

test('fills in defaults', () => {
	const validated = validate_config({});

	// @ts-expect-error - can't test equality of a function
	delete validated.kit.vite;

	assert.equal(validated, {
		extensions: ['.svelte'],
		kit: {
			adapter: null,
			amp: false,
			appDir: '_app',
			files: {
				assets: 'static',
				hooks: 'src/hooks',
				lib: 'src/lib',
				routes: 'src/routes',
				serviceWorker: 'src/service-worker',
				template: 'src/app.html'
			},
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				emitTypes: true,
				exports: {
					include: ['**'],
					exclude: ['**/_*']
				},
				files: {
					include: ['**'],
					exclude: []
				},
				override: null
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
		}
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
	}, /^config\.kit\.target should be a string, if specified$/);
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
			}
		}
	});

	assert.equal(validated.kit.vite(), {});

	// @ts-expect-error - can't test equality of a function
	delete validated.kit.vite;

	assert.equal(validated, {
		extensions: ['.svelte'],
		kit: {
			adapter: null,
			amp: false,
			appDir: '_app',
			files: {
				assets: 'public',
				hooks: 'src/hooks',
				lib: 'src/lib',
				routes: 'src/routes',
				serviceWorker: 'src/service-worker',
				template: 'src/app.html'
			},
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				emitTypes: true,
				exports: {
					include: ['**'],
					exclude: ['**/_*']
				},
				files: {
					include: ['**'],
					exclude: []
				},
				override: null
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
		}
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

test('fails if kit.appDir is only slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/'
			}
		});
	}, /^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration$/);
});

test('fails if kit.appDir starts with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/_app'
			}
		});
	}, /^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration$/);
});

test('fails if kit.appDir ends with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '_app/'
			}
		});
	}, /^config\.kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration$/);
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
	}, /^config\.kit\.paths\.base option must be a root-relative path that starts but doesn't end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration-paths$/);
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
	}, /^config\.kit\.paths\.base option must be a root-relative path that starts but doesn't end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration-paths$/);
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
	}, /^config\.kit\.paths\.assets option must be an absolute path, if specified. See https:\/\/kit\.svelte\.dev\/docs#configuration-paths$/);
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
	}, /^config\.kit\.paths\.assets option must not end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration-paths$/);
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
