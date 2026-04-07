/**
 * Component test setup file, injected by svelteKitTest({ mode: 'component' }).
 * Resets the mock registry between tests to ensure isolation.
 */
import { beforeEach, afterEach } from 'vitest';
import { resetMocks } from './mock-registry.js';

beforeEach(() => {
	resetMocks();
});

afterEach(() => {
	resetMocks();
});
