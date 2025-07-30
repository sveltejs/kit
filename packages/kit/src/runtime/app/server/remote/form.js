/** @import { RemoteForm } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
import { getRequestEvent } from '../event.js';
import { get_remote_info } from '../../../server/remote.js';
import { check_experimental, run_remote_function } from './shared.js';

/**
 * Creates a form action. The passed function will be called when the form is submitted.
 * Returns an object that can be spread onto a form element to connect it to the function.
 * ```ts
 * import * as db from '$lib/server/db';
 *
 * export const createPost = form((formData) => {
 * 	const title = formData.get('title');
 * 	const content = formData.get('content');
 * 	return db.createPost({ title, content });
 * });
 * ```
 * ```svelte
 * <script>
 * 	import { createPost } from './blog.remote.js';
 * </script>
 *
 * <form {...createPost}>
 * 	<input type="text" name="title" />
 * 	<textarea name="content" />
 * 	<button type="submit">Create</button>
 * </form>
 * ```
 *
 * @template T
 * @param {(formData: FormData) => MaybePromise<T>} fn
 * @returns {RemoteForm<T>}
 */
/*@__NO_SIDE_EFFECTS__*/
// @ts-ignore we don't want to prefix `fn` with an underscore, as that will be user-visible
export function form(fn) {
	check_experimental('form');

	/**
	 * @param {string | number | boolean} [key]
	 */
	function create_instance(key) {
		/** @type {RemoteForm<T>} */
		const instance = {};

		instance.method = 'POST';
		instance.onsubmit = () => {};

		Object.defineProperty(instance, 'enhance', {
			value: () => {
				return { action: instance.action, method: instance.method, onsubmit: instance.onsubmit };
			}
		});

		const form_action = {
			type: 'submit',
			onclick: () => {}
		};

		Object.defineProperty(form_action, 'enhance', {
			value: () => {
				return { type: 'submit', formaction: instance.formAction.formaction, onclick: () => {} };
			}
		});

		Object.defineProperty(instance, 'formAction', {
			value: form_action
		});

		/** @type {RemoteInfo} */
		const __ = {
			type: 'form',
			name: '',
			id: '',
			/** @param {FormData} form_data */
			fn: async (form_data) => {
				const event = getRequestEvent();
				const info = get_remote_info(event);

				info.refreshes ??= {};

				const result = await run_remote_function(event, true, form_data, (d) => d, fn);

				// We don't need to care about args or deduplicating calls, because uneval results are only relevant in full page reloads
				// where only one form submission is active at the same time
				if (!event.isRemoteRequest) {
					info.form_result = [key, result];
				}

				return result;
			}
		};

		Object.defineProperty(instance, '__', { value: __ });

		Object.defineProperty(instance, 'action', {
			get: () => `?/remote=${__.id}`,
			enumerable: true
		});

		Object.defineProperty(form_action, 'formaction', {
			get: () => `?/remote=${__.id}`,
			enumerable: true
		});

		Object.defineProperty(instance, 'result', {
			get() {
				try {
					const info = get_remote_info(getRequestEvent());
					return info.form_result && info.form_result[0] === key ? info.form_result[1] : undefined;
				} catch {
					return undefined;
				}
			}
		});

		Object.defineProperty(instance, 'error', {
			get() {
				// When a form post fails on the server the nearest error page will be rendered instead, so we don't need this
				return /** @type {any} */ (null);
			}
		});

		if (key == undefined) {
			Object.defineProperty(instance, 'for', {
				/** @type {RemoteForm<any>['for']} */
				value: (key) => {
					const info = get_remote_info(getRequestEvent());
					let instance = info.form_instances.get(key);

					if (!instance) {
						instance = create_instance(key);
						instance.__.id = `${__.id}/${encodeURIComponent(JSON.stringify(key))}`;
						instance.__.name = __.name;

						info.form_instances.set(key, instance);
					}

					return instance;
				}
			});
		}

		return instance;
	}

	return create_instance();
}
