import { expect, test } from 'vitest';
import { parse_redirects } from '../utils.js';

test('parse_redirects for _redirects file', () => {
	const redirects = parse_redirects(
		`
/home301 / 301
/notrailing/ /nottrailing 301

/blog/* https://blog.my.domain/:splat
`.trim()
	);

	expect(redirects).toEqual(['/home301', '/notrailing/', '/blog/*']);
});
