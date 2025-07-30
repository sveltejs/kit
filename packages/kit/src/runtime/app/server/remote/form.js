/** @import { RemoteForm } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
import { getRequestEvent } from '../event.js';
import { check_experimental, run_remote_function } from './shared.js';
import { get_event_state } from '../../../server/event-state.js';

/**
 * Creates a form object that can be spread onto a `<form>` element.
 * The callback runs with the current [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) when the form is submitted.
 *
 * ```ts
 * import { redirect } from '@sveltejs/kit';
 * import { form } from '$app/server';
 * import * as auth from '$lib/server/auth';
 * import * as db from '$lib/server/db';
 *
 * export const createPost = form(async (data) => {
 * 	const title = data.get('title');
 * 	const content = data.get('content');
 *
 * 	const user = await auth.getUser(); // get user from cookies, or throw an error
 * 	const post = await db.createPost({ user, title, content });
 *
 * 	redirect(303, `/blog/${post.slug}`);
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
 * @param {(data: FormData) => MaybePromise<T>} fn
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
				const state = get_event_state(event);

				state.refreshes ??= {};

				const result = await run_remote_function(event, true, form_data, (d) => d, fn);

				// We don't need to care about args or deduplicating calls, because uneval results are only relevant in full page reloads
				// where only one form submission is active at the same time
				if (!event.isRemoteRequest) {
					state.form_result = [key, result];
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
					const { form_result } = get_event_state(getRequestEvent());
					return form_result && form_result[0] === key ? form_result[1] : undefined;
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
					const state = get_event_state(getRequestEvent());
					let instance = (state.form_instances ??= new Map()).get(key);

					if (!instance) {
						instance = create_instance(key);
						instance.__.id = `${__.id}/${encodeURIComponent(JSON.stringify(key))}`;
						instance.__.name = __.name;

						state.form_instances.set(key, instance);
					}

					return instance;
				}
			});
		}

		return instance;
	}

	return create_instance();
}
