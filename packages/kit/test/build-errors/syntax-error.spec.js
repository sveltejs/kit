import { expect, test } from 'vitest';
import { build, timeout } from './utils.js';

test('a syntax error fails the build', { timeout }, () => {
	// forwarded from the parser, so there's no diagnostic code to check
	expect(build('syntax-error')).toContain('Unexpected end of input');
});
