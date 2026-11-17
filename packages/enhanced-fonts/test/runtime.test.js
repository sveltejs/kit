import { describe, expect, test } from 'vitest';
import { get_font, get_font_data } from '../src/runtime.js';

const registry = {
	'--font-a': {
		css: '@font-face { font-family: "A"; font-display: swap; } :root { --font-a: "A"; }',
		preloads: [
			{
				href: '/_app/immutable/fonts/a.123.woff2',
				type: 'font/woff2'
			}
		],
		data: [
			{
				src: [{ url: '/_app/immutable/fonts/a.123.woff2', format: 'woff2' }],
				weight: '400',
				style: 'normal',
				subset: 'latin'
			}
		]
	}
};

describe('unknown Font throws', () => {
	test('unknown cssVariable throws at lookup (build/SSR)', () => {
		expect(() => get_font(registry, '--font-not-in-config')).toThrow(
			/Unknown font cssVariable "--font-not-in-config"/
		);
	});

	test('fontData for a missing cssVariable throws', () => {
		expect(() => get_font_data(registry, '--missing')).toThrow(/Unknown font/);
	});

	test('known cssVariable returns css without requiring a JS font runtime', () => {
		const data = get_font(registry, '--font-a');
		expect(data.css).toContain('@font-face');
		expect(data.css).toContain('--font-a');
		expect(data.preloads).toHaveLength(1);
	});
});
