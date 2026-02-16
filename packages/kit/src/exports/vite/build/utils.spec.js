import { assert, test } from 'vitest';
import { create_dynamic_string } from './utils.js';

test('create_dynamic_string escapes backslashes', () => {
	const input = "div:after { content: '\\s'; }";
	const code = create_dynamic_string('css', [], input);
	assert.equal(code, "function css() { return `div:after { content: '\\\\s'; }`; }");

	const css = eval(`(${code})()`);

	assert.equal(css, input);
});
