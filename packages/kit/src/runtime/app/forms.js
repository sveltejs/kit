import * as devalue from 'devalue';
import { client } from '../client/singletons.js';
import { invalidateAll } from './navigation.js';

/**
 * @param {string} name
 */
function guard(name) {
	return () => {
		throw new Error(`Cannot call ${name}(...) on the server`);
	};
}

const ssr = import.meta.env.SSR;

/** @type {import('$app/forms').applyAction} */
export const applyAction = ssr ? guard('applyAction') : client.apply_action;

/** @type {import('$app/forms').deserialize} */
export function deserialize(result) {
	const parsed = JSON.parse(result);
	if (parsed.data) {
		parsed.data = devalue.parse(parsed.data);
	}
	return parsed;
}

/** @type {import('$app/forms').enhance} */
export function enhance(form, submit = () => {}) {
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
				HTMLFormElement.prototype.reset.call(form);
			}
			await invalidateAll();
		}

		// For success/invalid results, only apply action if it belongs to the
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
				: /** @type {HTMLFormElement} */ (HTMLFormElement.prototype.cloneNode.call(form)).action
		);

		const data = new FormData(form);

		const submitter_name = event.submitter?.getAttribute('name');
		if (submitter_name) {
			data.append(submitter_name, event.submitter?.getAttribute('value') ?? '');
		}

		const controller = new AbortController();

		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback =
			(await submit({
				action,
				cancel,
				controller,
				data,
				form
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
				body: data,
				signal: controller.signal
			});

			result = deserialize(await response.text());
		} catch (error) {
			if (/** @type {any} */ (error)?.name === 'AbortError') return;
			result = { type: 'error', error };
		}

		callback({
			action,
			data,
			form,
			update: (opts) => fallback_callback({ action, result, reset: opts?.reset }),
			// @ts-expect-error generic constraints stuff we don't care about
			result,
			// TODO remove for 1.0
			get type() {
				throw new Error('(result) => {...} has changed to ({ result }) => {...}');
			},
			get location() {
				throw new Error('(result) => {...} has changed to ({ result }) => {...}');
			},
			get error() {
				throw new Error('(result) => {...} has changed to ({ result }) => {...}');
			}
		});
	}

	// @ts-expect-error
	HTMLFormElement.prototype.addEventListener.call(form, 'submit', handle_submit);

	return {
		destroy() {
			// @ts-expect-error
			HTMLFormElement.prototype.removeEventListener.call(form, 'submit', handle_submit);
		}
	};
}
