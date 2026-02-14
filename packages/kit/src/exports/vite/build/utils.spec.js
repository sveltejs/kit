import { assert, describe, test } from 'vitest';
import { create_dynamic_css } from './utils.js';

describe('create_dynamic_css', () => {
	test.each([
		{
			name: 'escapes backticks',
			input: "div:after { content: '`'; }",
			expected: "function css() { return `div:after { content: '\\`'; }`; }"
		},
		{
			name: 'escapes interpolations',
			input: "div:after { content: '${example}'; }",
			expected: "function css() { return `div:after { content: '\\${example}'; }`; }"
		},
		{
			name: 'handles backslashes',
			input: "div:after { content: '\\s'; }",
			expected: "function css() { return `div:after { content: '\\\\s'; }`; }"
		}
	])('$name', ({ input, expected }) => {
		const code = create_dynamic_css(input, []);
		assert.equal(code, expected);

		let css;
		assert.doesNotThrow(() => {
			css = eval(`(${code})()`);
		});

		assert.equal(css, input);
	});
});
