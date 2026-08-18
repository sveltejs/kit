/** @import { ActionResult, SubmitFunction } from './types.js' */
import { DEV } from 'esm-env';
import { noop } from '../../../utils/functions.js';
import { refreshAll } from '../navigation/index.js';
import {
	applyAction,
	apply_action_navigation,
	handle_error,
	is_current_location
} from '../../client/client.js';
import { notify_version } from '#app/state/client';
import { deserialize } from './shared.js';

export { applyAction, deserialize };

/**
 * Shallow clone an element, so that we can access e.g. `form.action` without worrying
 * that someone has added an `<input name="action">` (https://github.com/sveltejs/kit/issues/7593)
 * @template {HTMLElement} T
 * @param {T} element
 * @returns {T}
 */
function clone(element) {
	return /** @type {T} */ (HTMLElement.prototype.cloneNode.call(element));
}

/**
 * This action enhances a `<form>` element that otherwise would work without JavaScript.
 *
 * The `submit` function is called upon submission with the given FormData and the `action` that should be triggered.
 * If `cancel` is called, the form will not be submitted.
 * You can use the abort `controller` to cancel the submission in case another one starts.
 * If a function is returned, that function is called with the response from the server.
 * If nothing is returned, the fallback will be used.
 *
 * If this function or its return value isn't set, it emulates the browser-native behaviour, just without the full-page reload. It
 * - resets the `<form>` element and refreshes all data in case of a successful submission with no redirect response
 * - updates the `form` prop, `page.form` and `page.status` if the action is on the same page as the form
 * - navigates to the page the submission lands on — populating that page's `form` prop and `page.status` — on success and failure if that isn't the current page, just as a native form submission would, but with the `?/actionName` param stripped from the destination URL
 * - redirects in case of a redirect response
 * - renders the nearest error page in case of an unexpected error — the one nearest the action's route, if the action is on a different page
 *
 * If you provide a custom function with a callback and want to use the default behavior, invoke `update` in your callback.
 * It accepts an options object
 * - `reset: false` if you don't want the `<form>` values to be reset after a successful submission
 * - `refreshAll` to control whether all data is refreshed after submission; it defaults to `true` for successes and `false` for failures
 * - `navigate: false` to apply non-redirect results to the current page rather than navigating to `result.location`; redirects are always followed
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {HTMLFormElement} form_element The form element
 * @param {SubmitFunction<Success, Failure>} submit Submit callback
 */
export function enhance(form_element, submit = noop) {
	if (DEV && clone(form_element).method !== 'post') {
		throw new Error('use:enhance can only be used on <form> fields with method="POST"');
	}

	/**
	 * @param {{
	 *   result: ActionResult;
	 *   reset?: boolean;
	 *   refreshAll?: boolean;
	 *   invalidateAll?: boolean;
	 *   navigate?: boolean;
	 * }} opts
	 */
	const fallback_callback = async ({
		result,
		reset = true,
		refreshAll: should_refresh_all,
		invalidateAll: deprecated_invalidate_all,
		navigate = true
	}) => {
		if (DEV && deprecated_invalidate_all !== undefined) {
			console.warn(
				'The `update({ invalidateAll })` option has been deprecated in favour of `update({ refreshAll })`'
			);
		}

		should_refresh_all ??= deprecated_invalidate_all ?? result.type === 'success';

		if (result.type === 'success' && reset) {
			// We call reset from the prototype to avoid DOM clobbering
			HTMLFormElement.prototype.reset.call(form_element);
		}

		const destination =
			navigate && result.type !== 'redirect' && !is_current_location(result.location)
				? result.location
				: undefined;

		if (destination === undefined) {
			if (should_refresh_all && result.type !== 'redirect') {
				await refreshAll();
			}

			await applyAction(result);
			return;
		}

		// emulate the browser: navigate to where the submission lands, rendering that
		// page with this result
		await apply_action_navigation(destination, result, should_refresh_all);
	};

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		const method = event.submitter?.hasAttribute('formmethod')
			? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formMethod
			: clone(form_element).method;
		if (method !== 'post') return;

		event.preventDefault();

		const action = new URL(
			// We can't do submitter.formAction directly because that property is always set
			event.submitter?.hasAttribute('formaction')
				? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
				: clone(form_element).action
		);

		const enctype = event.submitter?.hasAttribute('formenctype')
			? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formEnctype
			: clone(form_element).enctype;

		const form_data = new FormData(form_element, event.submitter);

		if (DEV && enctype !== 'multipart/form-data') {
			for (const value of form_data.values()) {
				if (value instanceof File) {
					throw new Error(
						'Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute. This will lead to inconsistent behavior between enhanced and native forms. For more details, see https://github.com/sveltejs/kit/issues/9819.'
					);
				}
			}
		}

		const controller = new AbortController();

		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback =
			(await submit({
				action,
				cancel,
				controller,
				formData: form_data,
				formElement: form_element,
				submitter: event.submitter
			})) ?? fallback_callback;
		if (cancelled) return;

		/** @type {ActionResult} */
		let result;

		try {
			const headers = new Headers({
				accept: 'application/json',
				'x-sveltekit-action': 'true'
			});

			// do not explicitly set the `Content-Type` header when sending `FormData`
			// or else it will interfere with the browser's header setting
			// see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects#sect4
			if (enctype !== 'multipart/form-data') {
				headers.set(
					'Content-Type',
					/^(:?application\/x-www-form-urlencoded|text\/plain)$/.test(enctype)
						? enctype
						: 'application/x-www-form-urlencoded'
				);
			}

			// @ts-expect-error `URLSearchParams(form_data)` is kosher, but typescript doesn't know that
			const body = enctype === 'multipart/form-data' ? form_data : new URLSearchParams(form_data);

			const response = await fetch(action, {
				method: 'POST',
				headers,
				cache: 'no-store',
				body,
				signal: controller.signal
			});

			// detect new deployments from the response header
			notify_version(response.headers.get('x-sveltekit-version'));

			result = deserialize(await response.text());
			if (result.type === 'error' || result.type === 'failure') {
				result.status = response.status;
			}
		} catch (error) {
			if (/** @type {any} */ (error)?.name === 'AbortError') return;
			result = {
				type: 'error',
				error: await handle_error(error, {
					params: {},
					route: { id: null },
					url: new URL(location.href)
				})
			};
		}

		await callback({
			action,
			formData: form_data,
			formElement: form_element,
			update: (opts) =>
				fallback_callback({
					result,
					reset: opts?.reset,
					refreshAll: opts?.refreshAll,
					invalidateAll: opts?.invalidateAll,
					navigate: opts?.navigate
				}),
			// @ts-expect-error generic constraints stuff we don't care about
			result
		});
	}

	// @ts-expect-error
	HTMLFormElement.prototype.addEventListener.call(form_element, 'submit', handle_submit);

	return {
		destroy() {
			// @ts-expect-error
			HTMLFormElement.prototype.removeEventListener.call(form_element, 'submit', handle_submit);
		}
	};
}
