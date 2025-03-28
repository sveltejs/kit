import { stringify, uneval } from 'devalue';
import { getRequestEvent } from './event.js';

/**
 * @template {(formData: FormData) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function formAction(fn) {
	/** @param {FormData} form_data */
	const wrapper = async (form_data) => {
		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(form_data);
		event._.remote_results[wrapper.form.action] = uneval_remote_response(result, event._.transport);
		return result;
	};
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, 'form', {
		value: { method: 'POST', action: '' },
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, 'formAction', {
		value: { formaction: '' },
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, '__type', {
		value: 'formAction',
		writable: false,
		enumerable: true,
		configurable: false
	});
	let set = false;
	Object.defineProperty(wrapper, '_set_action', {
		/** @param {string} action */
		value: (action) => {
			if (set) return;
			set = true;
			wrapper.form.action = `?/remote=${encodeURIComponent(action)}`;
			wrapper.formAction.formaction = `?/remote=${encodeURIComponent(action)}`;
		},
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, 'result', {
		get() {
			try {
				const event = getRequestEvent();
				return event._.remote_results[wrapper.form.action] ?? null;
			} catch (e) {
				return null;
			}
		},
		enumerable: true,
		configurable: false
	});

	// @ts-expect-error
	return wrapper;
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function query(fn) {
	/** @param {...Parameters<T>} args */
	const wrapper = async (...args) => {
		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(...args);
		const stringified_args = stringify(args, event._.transport);
		event._.remote_results[wrapper.__id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);
		return result;
	};
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, '__type', {
		value: 'query',
		writable: false,
		enumerable: true,
		configurable: false
	});
	// @ts-expect-error
	return wrapper;
}

/**
 * @param {any} data
 * @param {import('types').ServerHooks['transport']} transport
 */
export function uneval_remote_response(data, transport) {
	const replacer = (/** @type {any} */ thing) => {
		for (const key in transport) {
			const encoded = transport[key].encode(thing);
			if (encoded) {
				return `app.decode('${key}', ${uneval(encoded, replacer)})`;
			}
		}
	};

	// TODO try_serialize
	return uneval(data, replacer);
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function action(fn) {
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(fn, '__type', {
		value: 'action',
		writable: false,
		enumerable: true,
		configurable: false
	});
	return fn;
}
