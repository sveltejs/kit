import { describe, test, expect } from 'vitest';
import { validate_worker_settings } from './utils.js';

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
});
