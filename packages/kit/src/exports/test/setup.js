/**
 * Auto-context setup file, injected by the svelteKitTest() Vitest plugin.
 *
 * Establishes a default request store before each test using als.enterWith(),
 * so remote functions can be called directly without withRequestContext wrappers.
 * The ALS context survives nested with_request_store calls (used internally by
 * run_remote_function) because AsyncLocalStorage maintains a context stack.
 */
import { beforeEach, afterEach } from 'vitest';
import {
	__test_set_request_store,
	__test_clear_request_store
} from '@sveltejs/kit/internal/server';
import { createTestEvent, createTestState } from '@sveltejs/kit/test';

beforeEach(() => {
	__test_set_request_store({
		event: createTestEvent(),
		state: createTestState()
	});
});

afterEach(() => {
	__test_clear_request_store();
});
