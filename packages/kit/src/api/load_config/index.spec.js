import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { validate_config } from './index';

test('fills in defaults', () => {
	const validated = validate_config({});

	assert.equal(validated, {
		adapter: [null],
		target: null,
		startGlobal: null,
		files: {
			assets: 'static',
			routes: 'src/routes',
			setup: 'src/setup',
			template: 'src/app.html'
		},
		paths: {
			base: '',
			assets: '/.'
		},
		appDir: '_app'
	});
});

test('errors on invalid values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				target: 42
			}
		});
	}, /^kit\.target should be a string, if specified$/);
});

test('errors on invalid nested values', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				files: {
					potato: 'blah'
				}
			}
		});
	}, /^Unexpected option kit\.files\.potato$/);
});

test('fills in partial blanks', () => {
	const validated = validate_config({
		kit: {
			files: {
				assets: 'public'
			}
		}
	});

	assert.equal(validated, {
		adapter: [null],
		target: null,
		startGlobal: null,
		files: {
			assets: 'public',
			routes: 'src/routes',
			setup: 'src/setup',
			template: 'src/app.html'
		},
		paths: {
			base: '',
			assets: '/.'
		},
		appDir: '_app'
	});
});

test('fails if kit.appDir is blank', () => {
	assert.throws(() => {
		validate_config({
			kit: {
				appDir: ''
			}
		});
	}, /^kit\.appDir cannot be empty$/);
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
	}, /^kit\.paths\.base must be a root-relative path$/);
});

function validate_paths(name, input, output) {
	test(name, () => {
		assert.equal(
			validate_config({
				kit: {
					paths: input
				}
			}).paths,
			output
		);
	});
}

validate_paths('assets relative to empty string', {
	assets: 'path/to/assets'
}, {
	base: '',
	assets: '/path/to/assets'
});

validate_paths('assets relative to base path', {
	base: '/path/to/base',
	assets: 'path/to/assets'
}, {
	base: '/path/to/base',
	assets: '/path/to/base/path/to/assets'
});

validate_paths('empty assets relative to base path', {
	base: '/path/to/base'
}, {
	base: '/path/to/base',
	assets: '/path/to/base'
});

validate_paths('root-relative assets', {
	assets: '/path/to/assets'
}, {
	base: '',
	assets: '/path/to/assets'
});

validate_paths('root-relative assets with base path', {
	base: '/path/to/base',
	assets: '/path/to/assets'
}, {
	base: '/path/to/base',
	assets: '/path/to/assets'
});

validate_paths('external assets', {
	assets: 'https://cdn.example.com'
}, {
	base: '',
	assets: 'https://cdn.example.com'
});

validate_paths('external assets with base', {
	base: '/path/to/base',
	assets: 'https://cdn.example.com'
}, {
	base: '/path/to/base',
	assets: 'https://cdn.example.com'
});

test.run();
