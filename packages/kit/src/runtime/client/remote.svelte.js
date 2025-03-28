import { app_dir } from '__sveltekit/paths';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { app, remote_responses, started } from './client.js';

/**
 * @param {string} id
 */
export function remoteQuery(id) {
	// TODO disable "use event.fetch method instead" warning which can show up when you use remote functions in load functions
	return async (/** @type {any} */ ...args) => {
		const transport = app.hooks.transport;
		const encoders = Object.fromEntries(
			Object.entries(transport).map(([key, value]) => [key, value.encode])
		);

		const stringified_args = devalue.stringify(args, encoders);
		if (!started) {
			const result = remote_responses[id + stringified_args];
			if (result) return result;
		}

		const response = await fetch(
			`/${app_dir}/remote/${id}?args=${encodeURIComponent(stringified_args)}`
		);
		const result = await response.json();

		if (!response.ok) {
			// TODO should this go through `handleError`?
			throw new Error(result.message);
		}

		return devalue.parse(result, app.decoders);
	};
}

/**
 * @param {string} id
 */
export function remoteAction(id) {
	return async (/** @type {any} */ ...args) => {
		const transport = app.hooks.transport;
		const encoders = Object.fromEntries(
			Object.entries(transport).map(([key, value]) => [key, value.encode])
		);

		const response = await fetch(`/${app_dir}/remote/${id}`, {
			method: 'POST',
			body: devalue.stringify(args, encoders), // TODO maybe don't use devalue.stringify here
			headers: {
				'Content-Type': 'application/json'
			}
		});

		const result = await response.json();

		if (!response.ok) {
			// TODO should this go through `handleError`?
			throw new Error(result.message);
		}

		return devalue.parse(result, app.decoders);
	};
}

/**
 * @param {string} id
 */
export function remoteFormAction(id) {
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

	const action = '?/remote=' + encodeURIComponent(id);

	/** @type {any} */
	let result = $state(!started ? (remote_responses[action] ?? null) : null);

	return {
		get result() {
			return result;
		},
		form: {
			method: 'POST',
			action,
			/** @param {SubmitEvent} event */
			onsubmit: async (event) => {
				const form_element = /** @type {HTMLFormElement} */ (event.target);
				const method = event.submitter?.hasAttribute('formmethod')
					? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formMethod
					: clone(form_element).method;

				if (method !== 'post') return;

				const action = new URL(
					// We can't do submitter.formAction directly because that property is always set
					event.submitter?.hasAttribute('formaction')
						? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
						: clone(form_element).action
				);

				if (action.searchParams.get('/remote') !== id) {
					return;
				}

				event.preventDefault();

				const form_data = new FormData(form_element);

				if (DEV) {
					const enctype = event.submitter?.hasAttribute('formenctype')
						? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formEnctype
						: clone(form_element).enctype;
					if (enctype !== 'multipart/form-data') {
						for (const value of form_data.values()) {
							if (value instanceof File) {
								throw new Error(
									'Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute. This will lead to inconsistent behavior between enhanced and native forms. For more details, see https://github.com/sveltejs/kit/issues/9819.'
								);
							}
						}
					}
				}

				const submitter_name = event.submitter?.getAttribute('name');
				if (submitter_name) {
					form_data.append(submitter_name, event.submitter?.getAttribute('value') ?? '');
				}

				const response = await fetch(`/${app_dir}/remote/${id}`, {
					method: 'POST',
					body: form_data
				});
				const json = await response.json();

				if (!response.ok) {
					// TODO should this go through `handleError`?
					throw new Error(json.message);
				}

				return (result = devalue.parse(json, app.decoders));
			}
		},
		formAction: {
			formaction: action,
			/** @param {Event} event */
			onclick: async (event) => {
				const target = /** @type {HTMLButtonElement} */ (event.target);
				const form_element = target.form;
				if (!form_element) return;

				// Prevent this from firing the form's submit event
				event.stopPropagation();
				event.preventDefault();

				const form_data = new FormData(form_element);

				if (DEV) {
					const enctype = target.hasAttribute('formenctype')
						? target.formEnctype
						: clone(form_element).enctype;
					if (enctype !== 'multipart/form-data') {
						for (const value of form_data.values()) {
							if (value instanceof File) {
								throw new Error(
									'Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute. This will lead to inconsistent behavior between enhanced and native forms. For more details, see https://github.com/sveltejs/kit/issues/9819.'
								);
							}
						}
					}
				}

				const submitter_name = target.getAttribute('name');
				if (submitter_name) {
					form_data.append(submitter_name, target.getAttribute('value') ?? '');
				}

				const response = await fetch(`/${app_dir}/remote/${id}`, {
					method: 'POST',
					body: form_data
				});
				const json = await response.json();

				if (!response.ok) {
					// TODO should this go through `handleError`?
					throw new Error(json.message);
				}

				return (result = devalue.parse(json, app.decoders));
			}
		}
	};
}
