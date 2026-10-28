import { describe, expect, test } from 'vitest';
import { validate_families } from '../src/schema.js';

/** @param {string} cssVariable */
function family(cssVariable) {
	return {
		name: 'Inter',
		cssVariable,
		provider: 'google'
	};
}

describe('cssVariable accepts --font-* only', () => {
	test('accepts --font-inter and --font-sans', () => {
		expect(() => validate_families([family('--font-inter')])).not.toThrow();
		expect(() => validate_families([family('--font-sans')])).not.toThrow();
	});

	test('rejects ident that is not --font-*', () => {
		for (const cssVariable of [
			'font-inter',
			'--heading',
			'--heading-font',
			'--font:inter',
			'--font inter',
			'--font',
			'--font-',
			'--test'
		]) {
			expect(() => validate_families([family(cssVariable)]), cssVariable).toThrow(/--font-\*/);
		}
	});
});

describe('families schema', () => {
	test('empty families is allowed', () => {
		expect(() => validate_families([])).not.toThrow();
	});

	test('local provider requires src', () => {
		expect(() =>
			validate_families([
				{
					name: 'Inter',
					cssVariable: '--font-inter',
					provider: 'local'
				}
			])
		).toThrow(/src/);
	});

	test('google provider accepts a string family name', () => {
		expect(() =>
			validate_families([
				{
					name: 'Roboto',
					cssVariable: '--font-roboto',
					provider: 'google'
				}
			])
		).not.toThrow();
	});

	test('duplicate families[] cssVariable is a plugin error', () => {
		expect(() => validate_families([family('--font-inter'), family('--font-inter')])).toThrow(
			/--font-inter/
		);
	});
});

// Same CssVariable twice in one document (two <Font> in layout+page or one .svelte
// file) must SSR/build throw, not merge. ESLint covers same-file duplicates later.
// svelte-check is out of v1. Do not implement that throw in this unique-emit pass.
