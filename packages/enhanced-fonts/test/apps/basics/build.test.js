import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, test } from 'vitest';

const app = import.meta.dirname;
const out = path.join(app, '.svelte-kit/output');

beforeAll(() => {
	execFileSync('pnpm', ['exec', 'vite', 'build'], {
		cwd: app,
		stdio: 'pipe'
	});
}, 120_000);

/** @param {string} route */
function page_html(route) {
	const file =
		route === '/'
			? path.join(out, 'prerendered/pages/index.html')
			: path.join(out, 'prerendered/pages', `${route.slice(1)}.html`);
	return fs.readFileSync(file, 'utf8');
}

/** @param {string} html */
function font_preloads(html) {
	return [...html.matchAll(/<link[^>]+rel=["']preload["'][^>]*>/gi)].filter((m) =>
		/as=["']font["']/i.test(m[0])
	);
}

describe('default preload off and opt-in preload', () => {
	test('route with Font cssVariable only has @font-face and no font preload', () => {
		const html = page_html('/b');
		expect(html).toContain('@font-face');
		expect(html).toContain('--font-a');
		expect(html).toMatch(/font-display:\s*swap/);
		expect(font_preloads(html)).toHaveLength(0);
	});

	test('Font preload emits hashed immutable font links, not Google CDN', () => {
		const html = page_html('/');
		const links = font_preloads(html);
		expect(links.length).toBeGreaterThanOrEqual(1);
		for (const [tag] of links) {
			expect(tag).toMatch(/as=["']font["']/);
			expect(tag).toMatch(/crossorigin/);
			expect(tag).toMatch(/_app\/immutable\//);
			expect(tag).not.toContain('fonts.gstatic.com');
			expect(tag).not.toContain('fonts.googleapis.com');
		}
	});
});

describe('3-route preload matrix', () => {
	test('CSS for A on all routes; preload A only on /; B and C stay route-local', () => {
		const home = page_html('/');
		const b = page_html('/b');
		const c = page_html('/c');

		expect(home).toContain('--font-a');
		expect(b).toContain('--font-a');
		expect(c).toContain('--font-a');
		expect(home).toContain('@font-face');
		expect(b).toContain('@font-face');
		expect(c).toContain('@font-face');

		expect(font_preloads(home).length).toBeGreaterThanOrEqual(1);
		expect(font_preloads(b)).toHaveLength(0);

		expect(home).toContain('--font-b');
		expect(b).not.toContain('--font-b');
		expect(c).not.toContain('--font-b');
		expect(font_preloads(home).some(([tag]) => tag.includes('--font-b'))).toBe(false);

		expect(c).toContain('--font-c');
		expect(home).not.toContain('--font-c');
		expect(b).not.toContain('--font-c');
		expect(font_preloads(c).length).toBeGreaterThanOrEqual(1);
		expect(font_preloads(home).every(([tag]) => !tag.includes('font-c'))).toBe(true);
		expect(font_preloads(b)).toHaveLength(0);

		expect(b).toContain('--font-d');
		expect(home).not.toContain('--font-d');
		expect(c).not.toContain('--font-d');
		expect(font_preloads(home).every(([tag]) => !tag.includes('font-d'))).toBe(true);
		expect(font_preloads(b).every(([tag]) => !tag.includes('font-d'))).toBe(true);
		expect(font_preloads(c).every(([tag]) => !tag.includes('font-d'))).toBe(true);
	});
});

describe('emit before adapt()', () => {
	test('hashed fonts are in the client output before adapt() and writeFonts does not exist', () => {
		const probe = JSON.parse(fs.readFileSync(path.join(out, 'enhanced-fonts-adapt.json'), 'utf8'));
		expect(probe.has_write_fonts).toBe(false);
		expect(probe.fonts.length).toBeGreaterThanOrEqual(3);
		expect(probe.fonts.every((/** @type {string} */ f) => f.includes('_app/immutable'))).toBe(true);

		const build_fonts = fs
			.readdirSync(path.join(app, 'build/_app/immutable/fonts'))
			.filter((f) => f.endsWith('.woff2'));
		expect(build_fonts.length).toBeGreaterThanOrEqual(3);
	});

	test('prerendered HTML does not ship a fontless/runtime JS module', () => {
		const home = page_html('/');
		expect(home).not.toContain('fontless/runtime');
		expect(home).toContain('<style');
	});
});
