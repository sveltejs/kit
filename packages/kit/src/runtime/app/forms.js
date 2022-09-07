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
export function enhance(element, submit = () => {}) {
	/**
	 * @param {{
	 *   element: HTMLFormElement | HTMLButtonElement | HTMLInputElement;
	 *   form: HTMLFormElement;
	 *   result: import('types').ActionResult;
	 * }} opts
	 */
	const fallback_callback = async ({ element, form, result }) => {
		if (result.type === 'success') {
			await invalidateAll();
		}

		const action = element.formAction ?? form.action;

		if (location.origin + location.pathname === action.split('?')[0]) {
			applyAction(result);
		}
	};

	const form =
		element instanceof HTMLFormElement ? element : /** @type {HTMLFormElement} */ (element.form);
	if (!form) throw new Error('Element is not associated with a form');

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		event.preventDefault();

		const action = element.formAction ?? form.action;

		const data = new FormData(form);

		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback =
			submit({
				element,
				data,
				cancel,
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
				body: data
			});

			result = await response.json();
		} catch (error) {
			result = { type: 'error', error };
		}

		callback({
			element,
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
