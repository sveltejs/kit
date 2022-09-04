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

export const updateForm = ssr ? guard('updateForm') : client.update_form;

/** @type {import('types').enhance} */
export function enhance(form, { pending, error, invalid, redirect, result } = {}) {
	/** @type {unknown} */
	let current_token;

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		const token = (current_token = {});

		event.preventDefault();

		const data = new FormData(form);

		if (pending) pending({ data, form });

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				headers: {
					accept: 'application/json'
				},
				body: data
			});

			if (token !== current_token) return;

			if (response.ok) {
				/** @type {import('types').FormFetchResponse} */
				const json = await response.json();
				if (json.type === 'success') {
					if (result) {
						result({ data, form, response: /** @type {any} */ (json.data) });
					} else {
						await invalidateAll();
						await updateForm(json.data ?? null);
					}
				} else if (json.type === 'invalid') {
					if (invalid) {
						invalid({ data, form, response: /** @type {any} */ (json.data) });
					} else {
						await updateForm(json.data ?? null);
					}
				} else if (json.type === 'redirect') {
					if (redirect) {
						redirect({ data, form, location: json.location });
					} else {
						goto(json.location);
					}
				}
			} else if (error) {
				error({ data, form, error: null, response });
			} else {
				console.error(await response.text());
			}
		} catch (err) {
			if (error && err instanceof Error) {
				error({ data, form, error: err, response: null });
			} else {
				throw err;
			}
		}
	}

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
