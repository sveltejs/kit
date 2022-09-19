import { invalidateAll } from './navigation.js';
import { client } from '../client/singletons.js';

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

/** @type {import('$app/forms').enhance} */
export function enhance(form, submit = () => {}) {
	/**
	 * @param {{
	 *   action: URL;
	 *   result: import('types').ActionResult;
	 * }} opts
	 */
	const fallback_callback = async ({ action, result }) => {
		if (result.type === 'success') {
			await invalidateAll();
		}

		if (location.origin + location.pathname === action.origin + action.pathname) {
			applyAction(result);
		}
	};

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		event.preventDefault();

		const action = new URL(
			// We can't do submitter.formAction directly because that property is always set
			event.submitter?.hasAttribute('formaction')
				? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
				: form.action
		);

		const data = new FormData(form);
		const controller = new AbortController();

		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback =
			submit({
				action,
				cancel,
				controller,
				data,
				form
			}) ?? fallback_callback;
		if (cancelled) return;

		/** @type {import('types').ActionResult} */
		let result;

		try {
			const response = await fetch(action, {
				method: 'POST',
				headers: {
					accept: 'application/json'
				},
				body: data,
				signal: controller.signal
			});

			result = await response.json();
		} catch (error) {
			if (/** @type {any} */ (error)?.name === 'AbortError') return;
			result = { type: 'error', error };
		}

		callback({
			action,
			data,
			form,
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

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
