/** @import { ActionResult } from './types.js' */
import { parse } from '#app/internal/transport';

/**
 * Use this function to deserialize the response from a form submission.
 * Usage:
 *
 * ```js
 * import { deserialize } from '$app/forms';
 *
 * async function handleSubmit(event) {
 *   const response = await fetch('/form?/action', {
 *     method: 'POST',
 *     body: new FormData(event.target)
 *   });
 *
 *   const result = deserialize(await response.text());
 *   // ...
 * }
 * ```
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {string} result
 * @returns {ActionResult<Success, Failure>}
 */
export function deserialize(result) {
	const parsed = JSON.parse(result);

	if (parsed.data) {
		parsed.data = parse(parsed.data);
	}

	return parsed;
}
