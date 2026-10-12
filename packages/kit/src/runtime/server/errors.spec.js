/** @import { ServerHooks } from 'types' */
import { afterEach, expect, test, vi } from 'vitest';
import { SvelteKitError } from '@sveltejs/kit/internal';
import { RequestEvent, RENDER } from '@sveltejs/kit/internal/server';

vi.stubGlobal('__SVELTEKIT_DEV__', false);
vi.stubGlobal('__SVELTEKIT_SUPPORTS_ASYNC__', false);

const { handle_error_and_jsonify } = await import('./errors.js');
const { set_hooks } = await import('./internal.js');

const event = new RequestEvent(/** @type {any} */ ({}), 0, /** @type {any} */ ({}));

/** @param {ServerHooks['handleError']} handleError */
function use_hook(handleError) {
	set_hooks(/** @type {ServerHooks} */ (/** @type {unknown} */ ({ handleError })));
}

afterEach(() => {
	vi.restoreAllMocks();
});

test('logs a failing handleError hook with its cause and the original error, and falls back to a generic error', () => {
	const hook_error = new Error('hook broke');
	use_hook(() => {
		throw hook_error;
	});
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});
	const original = new Error('original');

	const body = handle_error_and_jsonify(event, original);

	expect(body).toEqual({ status: 500, message: 'Internal Error' });
	expect(log).toHaveBeenCalledTimes(2);

	const failure = log.mock.calls[0][0];
	expect(failure).toBeKitError('handle_error_hook_failed', { cause: hook_error });
	// the stack only contains the diagnostic, not SvelteKit's internals
	expect(failure.stack).toBe(`SvelteKit error: ${failure.message}`);
	expect(log).toHaveBeenNthCalledWith(2, 'Original error:', original);
});

test('keeps the status of framework errors when the handleError hook rejects', async () => {
	use_hook(() => Promise.reject('not an error'));
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});

	const body = await handle_error_and_jsonify(
		event,
		new SvelteKitError(404, 'Not Found', 'Not found: /a')
	);

	expect(body).toEqual({ status: 404, message: 'Internal Error' });
	expect(log.mock.calls[0][0]).toBeKitError('handle_error_hook_failed', {
		// non-errors are coalesced to errors, as before
		cause: expect.objectContaining({ message: '"not an error"' })
	});
	expect(log).toHaveBeenNthCalledWith(2, 'Original error: 404 Not Found: Not found: /a');
});

test('warns once and discards the result of an async handleError hook during rendering without async Svelte', () => {
	use_hook(() => Promise.resolve({ message: 'custom' }));
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

	const body = handle_error_and_jsonify(event.clone(RENDER), new Error('x'));

	expect(body).toEqual({ status: 500, message: 'Internal Error' });
	expect(warn).toHaveBeenCalledOnce();
	expect(warn).toContainKitDiagnostic('handle_error_async_without_async_svelte');
});
