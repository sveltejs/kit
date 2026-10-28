import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { write_css_variable_types } from '../src/types-gen.js';
import { merge_families, resolve_families } from '../src/resolve.js';

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
