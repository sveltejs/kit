import { describe, test, vi, expect } from 'vitest';
import { is_building_for_cloudflare_pages } from './utils.js';

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
						directory: 'dist/assets',
						binding: 'ASSETS'
					}
				})
			)
		).toBe(false);
	});
});
