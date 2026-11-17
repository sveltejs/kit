import { describe, expect, test } from 'vitest';
import { render_family_css } from '../src/css.js';

const family = {
	name: 'Inter',
	cssVariable: '--font-inter',
	provider: 'local'
};

const faces = [
	{
		url: '/_app/immutable/fonts/inter.abc123.woff2',
		weight: '400',
		style: 'normal'
	}
];

describe('font-display and CSS variables', () => {
	test('default emitted @font-face has font-display: swap', () => {
		const css = render_family_css(family, faces);
		expect(css).toMatch(/font-display:\s*swap/);
		expect(css).not.toMatch(/font-display:\s*optional/);
	});

	test("per-family display: 'optional' overrides swap", () => {
		const css = render_family_css({ ...family, display: 'optional' }, faces);
		expect(css).toMatch(/font-display:\s*optional/);
		expect(css).not.toMatch(/font-display:\s*swap/);
	});

	test('CSS variable in output is exactly the configured --font-*', () => {
		const css = render_family_css(family, faces);
		expect(css).toContain(':root');
		expect(css).toMatch(/--font-inter:\s*"Inter"/);
		expect(css).not.toContain('--heading');
	});
});
