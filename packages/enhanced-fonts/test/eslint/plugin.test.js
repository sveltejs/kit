import { describe, expect, test } from 'vitest';
import plugin from '../../eslint/index.js';

describe('@sveltejs/enhanced-fonts/eslint', () => {
	test('exports the three rules and a flat recommended config', () => {
		expect(Object.keys(plugin.rules ?? {}).sort()).toEqual([
			'css-variable-prefix',
			'no-duplicate-font',
			'no-google-fonts-cdn'
		]);
		expect(plugin.configs.recommended).toHaveLength(1);
		expect(plugin.configs.recommended[0].rules).toEqual({
			'@sveltejs/enhanced-fonts/no-google-fonts-cdn': 'error',
			'@sveltejs/enhanced-fonts/no-duplicate-font': 'error',
			'@sveltejs/enhanced-fonts/css-variable-prefix': 'error'
		});
	});
});
