import { RuleTester } from 'eslint';
import svelte_parser from 'svelte-eslint-parser';
import { describe, it } from 'vitest';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const tester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		parser: svelte_parser
	}
});

/**
 * @param {string} code
 * @param {string} [filename]
 */
export function svelte(code, filename = 'src/routes/+page.svelte') {
	return { code, filename };
}

/**
 * @param {string} code
 */
export function app_html(code) {
	return { code, filename: 'src/app.html' };
}
