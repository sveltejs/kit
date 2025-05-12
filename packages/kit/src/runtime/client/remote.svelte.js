import { app_dir } from '__sveltekit/paths';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import {
	app,
	invalidate,
	invalidateAll,
	remote_responses,
	pending_invalidate,
	started
} from './client.js';

/**
 * Contains a map of query functions that currently exist in the app.
 * Each value is a function that increases the associated version of that query which makes it rerun in case it was called in a reactive context.
 */
export const queryMap = new Map();
const resultMap = new Map();
const overrideMap = new Map();

let pending_fresh = false;

/**
 * @param {string} id
 */
export function remoteQuery(id) {
	function args_as_string(/** @type {any} */ ...args) {
		if (args.length === 0) return '';
		const transport = app.hooks.transport;
		const encoders = Object.fromEntries(
			Object.entries(transport).map(([key, value]) => [key, value.encode])
		);
		return devalue.stringify(args, encoders);
	}

	let version = $state(0);

	queryMap.set(id, () => version++);

	// TODO disable "use event.fetch method instead" warning which can show up when you use remote functions in load functions
	const fn = async (/** @type {any} */ ...args) => {
		const stringified_args = args_as_string(...args);

		// Reading the version ensures that the function reruns in reactive contexts if the version changes
		version;
		// TODO this is how we could get granular with the cache invalidation
		// const id = `${fn.key}|${stringified_args}`;
		// if (!queryMap.has(id)) {
		// 	version[id] = 0;
		// 	queryMap.set(id, () => version[id]++);
		// }
		// version[id]; // yes this will mean it reruns once for the first call but that is ok because of our caching

		let tracking = false;

		if ($effect.tracking()) {
			tracking = true;
			$effect(() => () => {
				tracking = false;
				// TODO this needs a counter of subscriptions to only delete when the last one is gone
				// reuse our subscribe function for this? (could be hard to do because if we do `import * as svelte from 'svelte'` we can't treeshake unused methods)
				overrideMap.delete(id + stringified_args);
			});
		}

		if (!resultMap.has(id)) {
			// TODO all a bit brittle, cleanup once we're sure we want this
			setTimeout(() => resultMap.delete(id), 500);
			const response = (async () => {
				if (!started) {
					const result = remote_responses[id + stringified_args];
					if (result) return result;
				}

				const url = `/${app_dir}/remote/${id}${stringified_args ? `?args=${encodeURIComponent(stringified_args)}` : ''}`;
				const response = await fetch(url);
				const result = await response.text();

				if (!response.ok) {
					// TODO should this go through `handleError`?
					throw new Error(JSON.parse(result).message);
				}

				const parsed_result = devalue.parse(result, app.decoders);
				if (tracking) {
					// TODO this is a bit of a hack, but we need to make sure that the result is not cached
					// if the user is tracking it. This is because we don't know when the user will stop tracking
					// so we need to make sure that the result is not cached until then.
					overrideMap.set(id + stringified_args, parsed_result);
				}
				return parsed_result;
			})();
			resultMap.set(id, response);
			return response;
		} else {
			const parsed_result = resultMap.get(id);
			if (tracking) {
				// TODO this is a bit of a hack, but we need to make sure that the result is not cached
				// if the user is tracking it. This is because we don't know when the user will stop tracking
				// so we need to make sure that the result is not cached until then.
				overrideMap.set(id + stringified_args, parsed_result);
			}
			return parsed_result;
		}
	};

	// fn.key = `query:${id}`; // by having a colon in there we can pass it to invalidate as it's a valid URL constructor parameter
	// fn.keyFor = (/** @type {any} */ ...args) => {
	// 	return `${fn.key}|${args_as_string(...args)}`;
	// };
	fn.refresh = () => {
		pending_fresh = true;
		queueMicrotask(() => (pending_fresh = false)); // TODO does that work? could it falsify a new true?
		queryMap.get(id)();
	};

	fn.override = (/** @type {any} */ ...args) => {
		const stringified_args = args_as_string(...args.slice(0, -1));
		const key = id + stringified_args;
		if (overrideMap.has(key)) {
			resultMap.set(key, args[args.length - 1](overrideMap.get(key)));
			version++;
			// TODO how to reliably invalidate this right after the microtask that the svelte runtime uses to rerun template effects?
			setTimeout(() => resultMap.delete(id), 500);
		}
	};

	return fn;
}

export const remotePrerender = remoteQuery;
export const remoteCache = remoteQuery;

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

		// If we want to invalidate from the server, this is how we would do it
		// for (const key of JSON.parse(response.headers.get('x-sveltekit-rpc-invalidate') ?? '[]')) {
		// 	invalidate(key);
		// }

		// We gotta do two microtasks here because the first one will resolve with the promise so it will run too soon
		queueMicrotask(() => {
			queueMicrotask(() => {
				// Users can granularily invalidate by calling query.refresh() or invalidate('foo:bar') themselves.
				// If that doesn't happen within a microtask we assume they want to invalidate everything.
				console.log('pending_invalidate', pending_invalidate, pending_fresh);
				if (pending_invalidate || pending_fresh) return;
				invalidateAll();
			});
		});

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

	const form_onsubmit = (callback) => {
		/** @param {SubmitEvent} event */
		return async (event) => {
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

			callback({
				submit: async () => {
					const response = await fetch(`/${app_dir}/remote/${id}`, {
						method: 'POST',
						body: form_data
					});
					const text = await response.text();

					if (!response.ok) {
						// TODO should this go through `handleError`?
						throw new Error(JSON.parse(text).message);
					}

					// TODO don't revalidate on validation error? should we bring fail() into this?
					// TODO only do when not enhanced? how to do for enhanced? have applyX for redirect? what about redirect in general?
					invalidateAll();

					return (result = devalue.parse(text, app.decoders));
				}
			});
		};
	};

	const form = {
		method: 'POST',
		action,
		onsubmit: form_onsubmit(({ submit }) => submit())
	};

	const form_action_onclick = (callback) => {
		/** @param {Event} event */
		return async (event) => {
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

			callback({
				submit: async () => {
					const response = await fetch(`/${app_dir}/remote/${id}`, {
						method: 'POST',
						body: form_data
					});
					const text = await response.text();

					if (!response.ok) {
						// TODO should this go through `handleError`?
						throw new Error(JSON.parse(text).message);
					}

					// TODO don't revalidate on validation error? should we bring fail() into this?
					// TODO only do when not enhanced? how to do for enhanced? have applyX for redirect? what about redirect in general?
					invalidateAll();

					return (result = devalue.parse(text, app.decoders));
				}
			});
		};
	};

	const form_action = {
		type: 'submit',
		formaction: action,
		onclick: form_action_onclick(({ submit }) => submit())
	};

	Object.defineProperties(form_action, {
		result: {
			get() {
				return result;
			},
			enumerable: false
		},
		enhance: {
			value: (callback) => {
				return {
					type: 'submit',
					formaction: action,
					onclick: form_action_onclick(callback)
				};
			},
			enumerable: false
		}
	});

	Object.defineProperties(form, {
		formAction: {
			value: form_action,
			enumerable: false
		},
		result: {
			get() {
				return result;
			},
			enumerable: false
		},
		enhance: {
			value: (callback) => {
				return {
					method: 'POST',
					action,
					onsubmit: form_onsubmit(callback)
				};
			},
			enumerable: false
		}
	});

	return form;
}
