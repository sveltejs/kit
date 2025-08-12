import { expect, test, vi } from 'vitest';
import path from 'node:path';
import { should_ignore } from './utils.js';

// Mock the colors module to avoid issues in tests
vi.mock('kleur', () => ({
	default: {
		bold: () => ({ red: (/** @type {string} */ str) => str })
	}
}));

// We need to test the warning_preprocessor functionality
// Since it's not exported, we'll recreate the relevant parts for testing
const options_regex = /(export\s+const\s+(prerender|csr|ssr|trailingSlash))\s*=/s;

/**
 * @param {string} content
 * @param {string} filename
 */
function should_warn_for_content(content, filename) {
	const basename = path.basename(filename);
	if (basename.startsWith('+page.') || basename.startsWith('+layout.')) {
		const match = content.match(options_regex);
		return match && match.index !== undefined && !should_ignore(content, match.index);
	}
	return false;
}

test.each([
	[
		'single-line comment with export const trailingSlash',
		'// export const trailingSlash = "always"',
		'+page.svelte',
		false
	],
	[
		'multi-line comment with export const trailingSlash',
		'/* export const trailingSlash = "always" */',
		'+page.svelte',
		false
	],
	[
		'HTML comment with export const trailingSlash',
		'<!-- export const trailingSlash = "always" -->',
		'+page.svelte',
		false
	],
	[
		'single-line comment with export const ssr',
		'// export const ssr = false',
		'+page.svelte',
		false
	],
	[
		'valid export const trailingSlash',
		'export const trailingSlash = "always"',
		'+page.svelte',
		true
	],
	['valid export const ssr', 'export const ssr = false', '+page.svelte', true],
	[
		'valid export const with spacing',
		'export const   trailingSlash   =   "always"',
		'+page.svelte',
		true
	],
	[
		'valid export on non-page file should not warn',
		'export const trailingSlash = "always"',
		'regular.svelte',
		false
	],
	[
		'comment followed by valid export',
		'// This is a comment\nexport const trailingSlash = "always"',
		'+page.svelte',
		true // Should still warn for the valid export
	],
	[
		'valid export with trailing comment',
		'export const trailingSlash = "always" // with comment after',
		'+page.svelte',
		true
	],
	[
		'comment with */ inside - not actually nested',
		'/* comment with */ inside */ export const trailingSlash = "always"',
		'+page.svelte',
		true // This should warn because the export is not in a comment
	],
	[
		'multiple line comment spanning lines',
		'/*\n * multi-line comment\n * export const trailingSlash = "always"\n */',
		'+page.svelte',
		false
	],
	[
		'multiple single-line comments',
		'// first comment\n// export const trailingSlash = "always"\n// third comment',
		'+page.svelte',
		false
	],
	[
		'HTML comment spanning multiple lines',
		'<!--\n  export const trailingSlash = "always"\n-->',
		'+page.svelte',
		false
	],
	[
		'edge case: comment delimiters in strings',
		'"/*"; export const trailingSlash = "always"; "*/"',
		'+page.svelte',
		true // Should warn because the export is not actually in a comment
	],
	[
		'escaped quotes in strings',
		'"comment with \\"/*\\" inside"; export const trailingSlash = "always"',
		'+page.svelte',
		true
	],
	[
		'single quotes with comment delimiters',
		"'/*'; export const trailingSlash = 'always'; '*/'",
		'+page.svelte',
		true
	],
	[
		'template literal with comment delimiters',
		'`/*`; export const trailingSlash = "always"; `*/`',
		'+page.svelte',
		true
	],
	[
		'real comment after string with comment delimiter',
		'"fake /*"; /* real comment with export const trailingSlash = "always" */',
		'+page.svelte',
		false
	],
	[
		'nested comment-like structures in strings',
		'"/* /* nested */ */"; export const trailingSlash = "always"',
		'+page.svelte',
		true
	],
	['page option match inside string', '"export const trailingSlash = true"', '+page.svelte', false],
	[
		'page option match inside template literal',
		'`${42}export const trailingSlash = true`',
		'+page.svelte',
		false
	]
])('warning behavior: %s', (_description, content, filename, should_warn) => {
	const result = should_warn_for_content(content, filename);
	expect(result).toBe(should_warn);
});
