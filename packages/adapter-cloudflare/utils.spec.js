import { describe, test, expect } from 'vitest';
import {
	validate_worker_settings,
} from './utils.js';

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

	test('missing `assets.directory` key', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js',
					assets: {
						binding: 'ASSETS'
					}
				})
			)
		).toThrow(
			`You must specify the \`assets.directory\` key in wrangler.jsonc. Consult https://developers.cloudflare.com/workers/static-assets/binding/#directory`
		);
	});

	test('missing `assets.binding` key', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js',
					assets: {
						directory: 'dist/assets'
					}
				})
			)
		).toThrow(
			`You must specify the \`assets.binding\` key in wrangler.jsonc before deploying your Worker. Consult https://developers.cloudflare.com/workers/static-assets/binding/#binding`
		);
	});

	test('missing `main` key or should remove `assets.binding` key', () => {
		expect(() =>
			validate_worker_settings(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					assets: {
						directory: 'dist/assets',
						binding: 'ASSETS'
					}
				})
			)
		).toThrow(
			`You must specify the \`main\` key in wrangler.jsonc if you want to deploy a Worker alongside your static assets. Otherwise, remove the \`assets.binding\` key if you only want to deploy static assets.`
		);
	});
});
