import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { write_css_variable_types } from '../src/types-gen.js';
import {
	font_base_from_vite_config,
	font_public_base,
	merge_families,
	resolve_families
} from '../src/resolve.js';

const fixture = fileURLToPath(new URL('./fixtures/test.woff2', import.meta.url));

describe('local resolve and merge', () => {
	test('local files are hashed for immutable client output', async () => {
		const resolved = await resolve_families(
			[
				{
					name: 'Test',
					cssVariable: '--font-test',
					provider: 'local',
					src: [{ path: fixture, weight: '400', style: 'normal' }]
				}
			],
			{ root: path.dirname(fixture), assets_dir: '_app/immutable' }
		);

		expect(resolved.files).toHaveLength(1);
		expect(resolved.files[0].file_name).toMatch(/^_app\/immutable\/fonts\/.+\.[a-f0-9]+\.woff2$/);
		expect(resolved.files[0].source.byteLength).toBeGreaterThan(0);
		expect(resolved.by_css_variable['--font-test'].css).toContain('font-display: swap');
		expect(resolved.by_css_variable['--font-test'].css).toContain('--font-test:');
	});

	test('two weights sharing bytes emit one hashed woff2 and one preload href', async () => {
		const resolved = await resolve_families(
			[
				{
					name: 'Inter',
					cssVariable: '--font-inter',
					provider: 'local',
					src: [
						{ path: fixture, weight: '400', style: 'normal' },
						{ path: fixture, weight: '600', style: 'normal' }
					]
				}
			],
			{ root: path.dirname(fixture), assets_dir: '_app/immutable' }
		);

		expect(resolved.files).toHaveLength(1);
		const preloads = resolved.by_css_variable['--font-inter'].preloads;
		const hrefs = preloads.map((entry) => entry.href);
		expect(hrefs).toHaveLength(1);
		expect(new Set(hrefs).size).toBe(1);
		expect(hrefs[0]).toMatch(/\/_app\/immutable\/fonts\/.+\.woff2$/);
		expect(resolved.by_css_variable['--font-inter'].data).toHaveLength(2);
	});

	test('merges two config entries with the same --font-* + name + provider', () => {
		const merged = merge_families([
			{
				name: 'Inter',
				cssVariable: '--font-inter',
				provider: 'local',
				src: [{ path: fixture, weight: '400', style: 'normal' }]
			},
			{
				name: 'Inter',
				cssVariable: '--font-inter',
				provider: 'local',
				src: [{ path: fixture, weight: '600', style: 'normal' }]
			}
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0].src).toHaveLength(2);
		expect(merged[0].src?.map((/** @type {{ weight?: string }} */ s) => s.weight)).toEqual([
			'400',
			'600'
		]);
	});

	test('merges Google styles and subsets for the same name and cssVariable', () => {
		const merged = merge_families([
			{
				name: 'Inter',
				cssVariable: '--font-inter',
				provider: 'google',
				weights: ['400'],
				styles: ['normal'],
				subsets: ['latin']
			},
			{
				name: 'Inter',
				cssVariable: '--font-inter',
				provider: 'google',
				weights: ['400'],
				styles: ['italic'],
				subsets: ['latin-ext']
			}
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0].styles).toEqual(['normal', 'italic']);
		expect(merged[0].subsets).toEqual(['latin', 'latin-ext']);
		expect(merged[0].weights).toEqual(['400']);
	});

	test('absolute CDN asset base keeps protocol slashes', async () => {
		const resolved = await resolve_families(
			[
				{
					name: 'Test',
					cssVariable: '--font-test',
					provider: 'local',
					src: [{ path: fixture, weight: '400', style: 'normal' }]
				}
			],
			{
				root: path.dirname(fixture),
				assets_dir: '_app/immutable',
				base: 'https://cdn.example.com/'
			}
		);

		expect(resolved.files[0].url).toMatch(
			/^https:\/\/cdn\.example\.com\/_app\/immutable\/fonts\/.+\.woff2$/
		);
	});

	test('relative Vite base emits root-relative font URLs', async () => {
		const resolved = await resolve_families(
			[
				{
					name: 'Test',
					cssVariable: '--font-test',
					provider: 'local',
					src: [{ path: fixture, weight: '400', style: 'normal' }]
				}
			],
			{
				root: path.dirname(fixture),
				assets_dir: '_app/immutable',
				base: './'
			}
		);

		expect(resolved.files[0].url).toMatch(/^\/_app\/immutable\/fonts\/.+\.woff2$/);
		expect(resolved.files[0].url).not.toMatch(/^\.\//);
	});

	test('relative Vite base plus Kit paths.base prefixes the app base', async () => {
		const resolved = await resolve_families(
			[
				{
					name: 'Test',
					cssVariable: '--font-test',
					provider: 'local',
					src: [{ path: fixture, weight: '400', style: 'normal' }]
				}
			],
			{
				root: path.dirname(fixture),
				assets_dir: '_app/immutable',
				base: font_public_base('./', '/sveltekit-fonts-playground')
			}
		);

		expect(resolved.files[0].url).toMatch(
			/^\/sveltekit-fonts-playground\/_app\/immutable\/fonts\/.+\.woff2$/
		);
	});

	test('Kit relative Vite config uses paths.base, not ./', () => {
		expect(
			font_base_from_vite_config({
				base: './',
				define: { __SVELTEKIT_PATHS_BASE__: JSON.stringify('/docs') }
			})
		).toBe('/docs');
		expect(font_base_from_vite_config({ base: './' })).toBe('');
	});
});

describe('generated CssVariable union', () => {
	test("writes a union of configured --font-* variables and not '--font-unknown'", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enhanced-fonts-types-'));
		const out = path.join(dir, 'css-variables.d.ts');
		write_css_variable_types(
			[{ cssVariable: '--font-inter' }, { cssVariable: '--font-display' }],
			out
		);
		const dts = fs.readFileSync(out, 'utf8');
		expect(dts).toContain("'--font-inter' | '--font-display'");
		expect(dts).not.toContain('--font-unknown');
	});
});
