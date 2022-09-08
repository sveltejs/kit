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
	 *   action: string;
	 *   result: import('types').ActionResult;
	 * }} opts
	 */
	const fallback_callback = async ({ action, result }) => {
		if (result.type === 'success') {
			await invalidateAll();
		}

		if (location.origin + location.pathname === action.split('?')[0]) {
			applyAction(result);
		}
	};

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		event.preventDefault();

		let action = form.action;
		const element_action = /** @type {HTMLButtonElement | HTMLInputElement | null} */ (
			event.submitter
		)?.formAction;
		// the browser will always set formAction - if not set, it defaults to the url;
		// we therefore have to check that formAction is indeed set
		if (action !== element_action && element_action) {
			if (
				// different urls
				action.split('?')[0] !== element_action.split('?')[0] ||
				// same url - formAction needs to be set to something or else we ignore it.
				// we take advantage of the fact that there cannot be a default and named action
				// at the same time.
				element_action.includes('?')
			) {
				action = element_action;
			}
		}
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
