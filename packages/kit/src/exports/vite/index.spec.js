import { expect, test, vi } from 'vitest';
import path from 'node:path';

// Mock the colors module to avoid issues in tests
vi.mock('kleur', () => ({
	default: {
		bold: () => ({ red: (str) => str })
	}
}));

// We need to test the warning_preprocessor functionality
// Since it's not exported, we'll recreate the relevant parts for testing
const options_regex = /(export\s+const\s+(prerender|csr|ssr|trailingSlash))\s*=/s;

/**
 * Check if a match position is within a comment
 * @param {string} content - The full content
 * @param {number} matchIndex - The index where the match starts
 * @returns {boolean} - True if the match is within a comment
 */
function isWithinComment(content, matchIndex) {
	// Check for single-line comment
	const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
	const lineContent = content.slice(lineStart, matchIndex);
	if (lineContent.trim().startsWith('//')) {
		return true;
	}

	// Check for multi-line comment /* */
	const beforeMatch = content.slice(0, matchIndex);
	const lastCommentStart = beforeMatch.lastIndexOf('/*');
	const lastCommentEnd = beforeMatch.lastIndexOf('*/');
	if (lastCommentStart > lastCommentEnd) {
		return true;
	}

	// Check for HTML comment <!-- -->
	const lastHtmlCommentStart = beforeMatch.lastIndexOf('<!--');
	const lastHtmlCommentEnd = beforeMatch.lastIndexOf('-->');
	if (lastHtmlCommentStart > lastHtmlCommentEnd) {
		return true;
	}

	return false;
}

function shouldWarnForContent(content, filename) {
	const basename = path.basename(filename);
	if (basename.startsWith('+page.') || basename.startsWith('+layout.')) {
		const match = content.match(options_regex);
		return match && !isWithinComment(content, match.index);
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
	[
		'valid export const ssr',
		'export const ssr = false',
		'+page.svelte',
		true
	],
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
	]
])('warning behavior: %s', (description, content, filename, shouldWarn) => {
	const result = shouldWarnForContent(content, filename);
	expect(result).toBe(shouldWarn);
});