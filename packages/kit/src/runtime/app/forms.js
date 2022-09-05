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

/** @type {import('$app/forms').updateForm} */
export const updateForm = ssr ? guard('updateForm') : client.update_form;

/** @type {import('$app/forms').enhance} */
export function enhance(form, { submit = () => {} } = {}) {
	/** @type {ReturnType<NonNullable<NonNullable<Parameters<import('$app/forms').enhance>[1]>['submit']>>} */
	const fallback_callback = (result) => {
		if (
			(result.type === 'success' || result.type === 'invalid') &&
			location.origin + location.pathname === form.action.split('?')[0]
		) {
			updateForm(result.data ?? null);
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

		const callback = submit({ form, data }) ?? fallback_callback;
		if (callback === false) {
			return;
		}

		/** @type {import('types').FormFetchResponse | { type: 'error'; error: unknown }} */
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

		callback(result);
	}

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
