import { goto, invalidateAll } from './navigation.js';
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
	/** @param {import('$app/forms').SubmissionResult} result */
	const fallback_callback = (result) => {
		if (
			(result.type === 'success' || result.type === 'invalid') &&
			location.origin + location.pathname === form.action.split('?')[0]
		) {
			applyAction(result);
		}

		if (result.type === 'success') {
			invalidateAll();
		} else if (result.type === 'redirect') {
			goto(result.location);
		} else if (result.type === 'error') {
			console.error(result.error);
		}
	};

	/** @type {unknown} */
	let current_token;

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		const token = (current_token = {});

		event.preventDefault();

		const data = new FormData(form);
		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback = submit({ form, data, cancel }) ?? fallback_callback;
		if (cancelled) {
			return;
		}

		/** @type {import('$app/forms').SubmissionResult} */
		let result;

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				headers: {
					accept: 'application/json'
				},
				body: data
			});

			if (token !== current_token) return;

			result = await response.json();
		} catch (error) {
			result = { type: 'error', error };
		}

		callback(/** @type {import('$app/forms').SubmissionResult<any, any>} */ (result));
	}

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
