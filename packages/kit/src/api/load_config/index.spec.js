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
		}
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
		}
	});
});

test.run();
