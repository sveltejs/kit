/** @import { RemoteForm } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { check_experimental, run_remote_function } from './shared.js';

/**
 * Creates a form object that can be spread onto a `<form>` element.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 *
 * @template T
 * @param {(data: FormData) => MaybePromise<T>} fn
 * @returns {RemoteForm<T>}
 * @since 2.27
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

		const button_props = {
			type: 'submit',
			onclick: () => {}
		};

		Object.defineProperty(button_props, 'enhance', {
			value: () => {
				return { type: 'submit', formaction: instance.buttonProps.formaction, onclick: () => {} };
			}
		});

		Object.defineProperty(instance, 'buttonProps', {
			value: button_props
		});

		/** @type {RemoteInfo} */
		const __ = {
			type: 'form',
			name: '',
			id: '',
			/** @param {FormData} form_data */
			fn: async (form_data) => {
				const { event, state } = get_request_store();

				state.refreshes ??= {};

				const result = await run_remote_function(event, state, true, form_data, (d) => d, fn);

				// We don't need to care about args or deduplicating calls, because uneval results are only relevant in full page reloads
				// where only one form submission is active at the same time
				if (!event.isRemoteRequest) {
					(state.remote_data ??= {})[__.id] = result;
				}

				return result;
			}
		};

		Object.defineProperty(instance, '__', { value: __ });

		Object.defineProperty(instance, 'action', {
			get: () => `?/remote=${__.id}`,
			enumerable: true
		});

		Object.defineProperty(button_props, 'formaction', {
			get: () => `?/remote=${__.id}`,
			enumerable: true
		});

		Object.defineProperty(instance, 'result', {
			get() {
				try {
					const { remote_data } = get_request_store().state;
					return remote_data?.[__.id];
				} catch {
					return undefined;
				}
			}
		});

		// On the server, pending is always 0
		Object.defineProperty(instance, 'pending', {
			get: () => 0
		});

		// On the server, buttonProps.pending is always 0
		Object.defineProperty(button_props, 'pending', {
			get: () => 0
		});

		if (key == undefined) {
			Object.defineProperty(instance, 'for', {
				/** @type {RemoteForm<any>['for']} */
				value: (key) => {
					const { state } = get_request_store();
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
