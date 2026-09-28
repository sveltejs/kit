import { expect, test } from 'vitest';
import * as e from '../build-errors.js';
import { capture_message } from './build.js';

test('capture_message returns the full text of a build diagnostic', () => {
	const code = 'prerender_invalid_url';

	expect(capture_message(() => e.prerender_invalid_url({ href: 'http://', referrer: '/a' }))).toBe(
		`${code}\nInvalid URL http:// (linked from /a)\nhttps://next.svelte.dev/e/@sveltejs/kit/${code}`
	);
});
