import { describe, test, vi, expect } from 'vitest';
import { is_building_for_cloudflare_pages, validate_worker_settings } from './utils.js';

describe('detects Cloudflare Pages project', () => {
	test('by default', () => {
		expect(
			is_building_for_cloudflare_pages(/** @type {import('wrangler').Unstable_Config} */ ({}))
		).toBe(true);
	});

	test('CF_PAGES environment variable', () => {
		vi.stubEnv('CF_PAGES', '1');
		const result = is_building_for_cloudflare_pages(
			/** @type {import('wrangler').Unstable_Config} */ ({})
		);
		vi.unstubAllEnvs();
		expect(result).toBe(true);
	});

	test('empty Wrangler configuration file', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc'
				})
			)
		).toBe(true);
	});

	test('pages_build_output_dir config key', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					pages_build_output_dir: 'dist'
				})
			)
		).toBe(true);
	});
});

describe('detects Cloudflare Workers project', () => {
	test('main config key', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					main: 'dist/index.js'
				})
			)
		).toBe(false);
	});

	test('assets config key', () => {
		expect(
			is_building_for_cloudflare_pages(
				/** @type {import('wrangler').Unstable_Config} */ ({
					configPath: 'wrangler.jsonc',
					assets: {
						directory: 'dist/assets'
					}
				})
			)
		).toBe(false);
	});
});

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
			`You must set the \`main\` key in wrangler.jsonc if you want to deploy a Worker alongside your static assets or remove the \`assets.binding\` key if you only want to deploy static assets.`
		);
	});
});
