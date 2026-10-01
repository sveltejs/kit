import { expect, test } from 'vitest';
import * as e from '../build-errors.js';
import { capture_message } from './build.js';

test('capture_message returns the full text of a build diagnostic', () => {
	const message = capture_message(() =>
		e.prerender_invalid_url({ href: 'http://', referrer: '/a' })
	);

	expect(message.startsWith('prerender_invalid_url\n')).toBe(true);
	expect(message).toContainKitDiagnostic('prerender_invalid_url', { contains: ['http://', '/a'] });
});
