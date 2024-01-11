/**
 * This action updates the `form` property of the current page with the given data and updates `$page.status`.
 * In case of an error, it redirects to the nearest error page.
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {import('@sveltejs/kit').ActionResult<Success, Failure>} result
 * @returns {Promise<void>}
 */
export function applyAction<Success extends Record<string, unknown> | undefined, Failure extends Record<string, unknown> | undefined>(result: import("@sveltejs/kit").ActionResult<Success, Failure>): Promise<void>;
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
 * @returns {import('@sveltejs/kit').ActionResult<Success, Failure>}
 */
export function deserialize<Success extends Record<string, unknown> | undefined, Failure extends Record<string, unknown> | undefined>(result: string): import("@sveltejs/kit").ActionResult<Success, Failure>;
/**
 * This action enhances a `<form>` element that otherwise would work without JavaScript.
 *
 * The `submit` function is called upon submission with the given FormData and the `action` that should be triggered.
 * If `cancel` is called, the form will not be submitted.
 * You can use the abort `controller` to cancel the submission in case another one starts.
 * If a function is returned, that function is called with the response from the server.
 * If nothing is returned, the fallback will be used.
 *
 * If this function or its return value isn't set, it
 * - falls back to updating the `form` prop with the returned data if the action is one same page as the form
 * - updates `$page.status`
 * - resets the `<form>` element and invalidates all data in case of successful submission with no redirect response
 * - redirects in case of a redirect response
 * - redirects to the nearest error page in case of an unexpected error
 *
 * If you provide a custom function with a callback and want to use the default behavior, invoke `update` in your callback.
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {HTMLFormElement} form_element The form element
 * @param {import('@sveltejs/kit').SubmitFunction<Success, Failure>} submit Submit callback
 */
export function enhance<Success extends Record<string, unknown> | undefined, Failure extends Record<string, unknown> | undefined>(form_element: HTMLFormElement, submit?: import("@sveltejs/kit").SubmitFunction<Success, Failure>): {
    destroy(): void;
};
//# sourceMappingURL=forms.d.ts.map