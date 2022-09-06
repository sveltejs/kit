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
	/** @param {import('types').ActionResult} result */
	const fallback_callback = async (result) => {
		if (result.type === 'success') {
			await invalidateAll();
		}

		if (location.origin + location.pathname === form.action.split('?')[0]) {
			applyAction(result);
		}
	};

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		event.preventDefault();

		const data = new FormData(form);

		let cancelled = false;
		const cancel = () => (cancelled = true);

		const callback = submit({ form, data, cancel }) ?? fallback_callback;
		if (cancelled) return;

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				headers: {
					accept: 'application/json'
				},
				body: data
			});

			callback(await response.json());
		} catch (error) {
			callback({ type: 'error', error });
		}
	}

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
