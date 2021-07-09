import { suite, test } from 'uvu';
import * as assert from 'uvu/assert';
import { deep_merge, validate_config } from './index.js';

test('fills in defaults', () => {
	const validated = validate_config({});

	delete validated.kit.vite;

	assert.equal(validated, {
		compilerOptions: null,
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
				setup: 'src/setup',
				template: 'src/app.html'
			},
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				exports: {
					include: ['**'],
					exclude: ['_*', '**/_*']
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
			target: null,
			trailingSlash: 'never'
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
			adapter: null,
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
			floc: false,
			host: null,
			hostHeader: null,
			hydrate: true,
			package: {
				dir: 'package',
				exports: {
					include: ['**'],
					exclude: ['_*', '**/_*']
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
	}, /^config\.kit\.appDir cannot be empty$/);
});

test('fails if kit.appDir is only slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/'
			}
		});
	}, /^kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration$/);
});

test('fails if kit.appDir starts with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '/_app'
			}
		});
	}, /^kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration$/);
});

test('fails if kit.appDir ends with slash', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: '_app/'
			}
		});
	}, /^kit\.appDir cannot start or end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration$/);
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
	}, /^kit\.paths\.base option must be a root-relative path that starts but doesn't end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration-paths$/);
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
	}, /^kit\.paths\.base option must be a root-relative path that starts but doesn't end with '\/'. See https:\/\/kit\.svelte\.dev\/docs#configuration-paths$/);
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

const deepMergeSuite = suite('deep_merge');

deepMergeSuite('basic test no conflicts', async () => {
	const [merged, conflicts] = deep_merge(
		{
			version: 1,
			animalSounds: {
				cow: 'moo'
			}
		},
		{
			animalSounds: {
				duck: 'quack'
			},
			locale: 'en_US'
		}
	);
	assert.equal(merged, {
		version: 1,
		locale: 'en_US',
		animalSounds: {
			cow: 'moo',
			duck: 'quack'
		}
	});
	assert.equal(conflicts, []);
});

deepMergeSuite('three way merge no conflicts', async () => {
	const [merged, conflicts] = deep_merge(
		{
			animalSounds: {
				cow: 'moo'
			}
		},
		{
			animalSounds: {
				duck: 'quack'
			}
		},
		{
			animalSounds: {
				dog: {
					singular: 'bark',
					plural: 'barks'
				}
			}
		}
	);
	assert.equal(merged, {
		animalSounds: {
			cow: 'moo',
			duck: 'quack',
			dog: {
				singular: 'bark',
				plural: 'barks'
			}
		}
	});
	assert.equal(conflicts, []);
});

deepMergeSuite('merge with conflicts', async () => {
	const [merged, conflicts] = deep_merge(
		{
			person: {
				firstName: 'John',
				lastName: 'Doe',
				address: {
					line1: '123 Main St',
					city: 'Seattle',
					state: 'WA'
				}
			}
		},
		{
			person: {
				middleInitial: 'Q',
				address: '123 Main St, Seattle, WA'
			}
		}
	);
	assert.equal(merged, {
		person: {
			firstName: 'John',
			middleInitial: 'Q',
			lastName: 'Doe',
			address: '123 Main St, Seattle, WA'
		}
	});
	assert.equal(conflicts, ['person.address']);
});

deepMergeSuite('merge with arrays', async () => {
	const [merged] = deep_merge(
		{
			paths: ['/foo', '/bar']
		},
		{
			paths: ['/alpha', '/beta']
		}
	);
	assert.equal(merged, {
		paths: ['/foo', '/bar', '/alpha', '/beta']
	});
});

deepMergeSuite('empty', async () => {
	const [merged] = deep_merge();
	assert.equal(merged, {});
});

deepMergeSuite('mutability safety', () => {
	const input1 = {
		person: {
			firstName: 'John',
			lastName: 'Doe',
			address: {
				line1: '123 Main St',
				city: 'Seattle'
			}
		}
	};
	const input2 = {
		person: {
			middleInitial: 'L',
			lastName: 'Smith',
			address: {
				state: 'WA'
			}
		}
	};
	const snapshot1 = JSON.stringify(input1);
	const snapshot2 = JSON.stringify(input2);

	const [merged] = deep_merge(input1, input2);

	// Mess with the result
	merged.person.middleInitial = 'Z';
	merged.person.address.zipCode = '98103';
	merged.person = {};

	// Make sure nothing in the inputs changed
	assert.snapshot(snapshot1, JSON.stringify(input1));
	assert.snapshot(snapshot2, JSON.stringify(input2));
});

deepMergeSuite('merge buffer', () => {
	const [merged, conflicts] = deep_merge(
		{
			x: Buffer.from('foo', 'utf-8')
		},
		{
			y: 12345
		}
	);
	assert.equal(Object.keys(merged), ['x', 'y']);
	assert.equal(conflicts.length, 0);
});

deepMergeSuite('merge including toString', () => {
	const [merged, conflicts] = deep_merge(
		{
			toString: () => '',
			constructor: () => ''
		},
		{
			y: 12345
		}
	);
	assert.equal(conflicts.length, 0);
	assert.equal(Object.keys(merged), ['toString', 'constructor', 'y']);
});

deepMergeSuite.run();
