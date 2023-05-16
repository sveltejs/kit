import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { client_method } from '../client/singletons.js';
import { invalidateAll } from './navigation.js';

export const applyAction = client_method('apply_action');

/** @type {import('$app/forms').deserialize} */
export function deserialize(result) {
	const parsed = JSON.parse(result);
	if (parsed.data) {
		parsed.data = devalue.parse(parsed.data);
	}
	return parsed;
}

/**
 * @param {string} old_name
 * @param {string} new_name
 * @param {string} call_location
 * @returns void
 */
function warn_on_access(old_name, new_name, call_location) {
	if (!DEV) return;
	// TODO 2.0: Remove this code
	console.warn(
		`\`${old_name}\` has been deprecated in favor of \`${new_name}\`. \`${old_name}\` will be removed in a future version. (Called from ${call_location})`
	);
}

/** @type {import('$app/forms').enhance} */
export function enhance(form_element, submit = () => {}) {
	if (
		DEV &&
		/** @type {HTMLFormElement} */ (HTMLFormElement.prototype.cloneNode.call(form_element))
			.method !== 'post'
	) {
		throw new Error('use:enhance can only be used on <form> fields with method="POST"');
	}

	/**
	 * @param {{
	 *   action: URL;
	 *   result: import('types').ActionResult;
	 *   reset?: boolean
	 * }} opts
	 */
	const fallback_callback = async ({ action, result, reset }) => {
		if (result.type === 'success') {
			if (reset !== false) {
				// We call reset from the prototype to avoid DOM clobbering
				HTMLFormElement.prototype.reset.call(form_element);
			}
			await invalidateAll();
		}

		// For success/failure results, only apply action if it belongs to the
		// current page, otherwise `form` will be updated erroneously
		if (
			location.origin + location.pathname === action.origin + action.pathname ||
			result.type === 'redirect' ||
			result.type === 'error'
		) {
			applyAction(result);
		}
	};

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		event.preventDefault();

		const action = new URL(
			// We can't do submitter.formAction directly because that property is always set
			// We do cloneNode for avoid DOM clobbering - https://github.com/sveltejs/kit/issues/7593
			event.submitter?.hasAttribute('formaction')
				? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
				: /** @type {HTMLFormElement} */ (HTMLFormElement.prototype.cloneNode.call(form_element))
						.action
		);

		const form_data = new FormData(form_element);

		const submitter_name = event.submitter?.getAttribute('name');
		if (submitter_name) {
			form_data.append(submitter_name, event.submitter?.getAttribute('value') ?? '');
		}

		const controller = new AbortController();

		let cancelled = false;
		const cancel = () => (cancelled = true);

		// TODO 2.0: Remove `data` and `form`
		const callback =
			(await submit({
				action,
				cancel,
				controller,
				get data() {
					warn_on_access('data', 'formData', 'use:enhance submit function');
					return form_data;
				},
				formData: form_data,
				get form() {
					warn_on_access('form', 'formElement', 'use:enhance submit function');
					return form_element;
				},
				formElement: form_element,
				submitter: event.submitter
			})) ?? fallback_callback;
		if (cancelled) return;

		/** @type {import('types').ActionResult} */
		let result;

		try {
			const response = await fetch(action, {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'x-sveltekit-action': 'true'
				},
				cache: 'no-store',
				body: form_data,
				signal: controller.signal
			});

			result = deserialize(await response.text());
			if (result.type === 'error') result.status = response.status;
		} catch (error) {
			if (/** @type {any} */ (error)?.name === 'AbortError') return;
			result = { type: 'error', error };
		}

		callback({
			action,
			get data() {
				warn_on_access('data', 'formData', 'callback returned from use:enhance submit function');
				return form_data;
			},
			formData: form_data,
			get form() {
				warn_on_access('form', 'formElement', 'callback returned from use:enhance submit function');
				return form_element;
			},
			formElement: form_element,
			update: (opts) => fallback_callback({ action, result, reset: opts?.reset }),
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
