/** @import { ESLint, Linter } from 'eslint' */
import { css_variable_prefix } from './rules/css-variable-prefix.js';
import { no_duplicate_font } from './rules/no-duplicate-font.js';
import { no_google_fonts_cdn } from './rules/no-google-fonts-cdn.js';

/**
 * @typedef {Omit<ESLint.Plugin, 'rules' | 'configs'> & {
 *   rules: Record<string, import('eslint').Rule.RuleModule>
 *   configs: { recommended: Linter.Config[] }
 * }} EnhancedFontsEslintPlugin
 */

/** @type {EnhancedFontsEslintPlugin} */
const plugin = {
	meta: {
		name: '@sveltejs/enhanced-fonts/eslint'
	},
	rules: {
		'no-google-fonts-cdn': no_google_fonts_cdn,
		'no-duplicate-font': no_duplicate_font,
		'css-variable-prefix': css_variable_prefix
	},
	configs: {
		recommended: []
	}
};

plugin.configs.recommended = [
	{
		name: '@sveltejs/enhanced-fonts/eslint/recommended',
		files: ['**/*.svelte', '**/app.html'],
		plugins: {
			'@sveltejs/enhanced-fonts': plugin
		},
		rules: {
			'@sveltejs/enhanced-fonts/no-google-fonts-cdn': 'error',
			'@sveltejs/enhanced-fonts/no-duplicate-font': 'error',
			'@sveltejs/enhanced-fonts/css-variable-prefix': 'error'
		}
	}
];

export default plugin;
export const configs = plugin.configs;
export const rules = plugin.rules;
