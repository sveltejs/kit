import { ValidationError } from '../internal/shared.js';

/**
 * Checks whether this is an validation error thrown by [`invalid`](https://svelte.dev/docs/kit/@sveltejs-kit#invalid).
 * @param {unknown} e The object to check.
 * @return {e is import('@sveltejs/kit/remote').ValidationError}
 * @since 2.47.3
 */
export function isValidationError(e) {
	return e instanceof ValidationError;
}
