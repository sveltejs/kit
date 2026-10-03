/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { RequestStore, UniversalCacheEntry } from 'types' */
/** @import { UniversalInternals, UniversalFormOutput } from './shared.js' */
import { try_get_request_store, with_request_store } from '@sveltejs/kit/internal/server';
import { stringify_remote_arg } from '../../shared.js';
import { create_field_proxy, deep_set, flatten_issues } from '../../form-utils.js';
import { noop } from '../../../utils/functions.js';
import {
	UNIVERSAL,
	UNIVERSAL_ACTION_PARAM,
	attach_internals,
	create_internals,
	get_form_action_id,
	run_form_handler,
	redact_input
} from './shared.js';
import * as e from '../../../messages/server-errors.js';

// ---------------------------------------------------------------------------------------------
// Running user code
// ---------------------------------------------------------------------------------------------

const PATCHED = Symbol.for('sveltekit.universal_fetch');

/**
 * Universal functions are written as if they run in the browser, which means they use the global
 * `fetch` with relative URLs. On the server, those calls must go through `event.fetch`, which knows
 * how to resolve relative URLs, forwards cookies and calls internal endpoints directly.
 *
 * We patch `globalThis.fetch` so that while (and only while) a universal function is running
 * (as determined by the request store), it delegates to `event.fetch`. Everything else falls
 * through to the original `fetch`. We re-check the patch before each run because SvelteKit
 * itself temporarily swaps out `globalThis.fetch` during rendering in dev.
 */
function ensure_fetch_patch() {
	const original = globalThis.fetch;
	if (/** @type {any} */ (original)[PATCHED]) return;

	/** @type {typeof fetch} */
	const patched = (input, init) => {
		const store = try_get_request_store();

		if (store?.state.is_in_universal_function) {
			return store.event.fetch(input, init);
		}

		return original(input, init);
	};

	Object.defineProperty(patched, PATCHED, { value: true });
	globalThis.fetch = patched;
}

ensure_fetch_patch();

/**
 * Runs `fn` in the context of the given request (if any), marking it as running inside a universal function
 * @template T
 * @param {RequestStore | null} store
 * @param {() => T} fn
 * @returns {T}
 */
function run(store, fn) {
	if (!store) return fn();

	ensure_fetch_patch();

	return with_request_store(
		{ event: store.event, state: { ...store.state, is_in_universal_function: true } },
		fn
	);
}

// ---------------------------------------------------------------------------------------------
// Request-scoped cache
// ---------------------------------------------------------------------------------------------

/**
 * @param {RequestStore} store
 * @param {UniversalInternals} internals
 * @returns {Map<string, UniversalCacheEntry>}
 */
function get_entries(store, internals) {
	const data = (store.state.universal.data ??= new Map());
	let entries = data.get(internals);

	if (!entries) {
		entries = new Map();
		data.set(internals, entries);
	}

	return entries;
}

/**
 * @param {() => any} get_value
 * @returns {UniversalCacheEntry}
 */
function create_entry(get_value) {
	/** @type {UniversalCacheEntry} */
	const entry = {
		settled: false,
		failed: false,
		value: undefined,
		error: undefined,
		promise: /** @type {any} */ (null)
	};

	// wait a microtask so that a synchronous `.set(...)` after creation wins
	entry.promise = Promise.resolve()
		.then(get_value)
		.then(
			(value) => {
				entry.settled = true;
				entry.value = value;
				return value;
			},
			(error) => {
				entry.settled = true;
				entry.failed = true;
				entry.error = error;
				throw error;
			}
		);

	// rejections are surfaced to whoever awaits the resource
	entry.promise.catch(noop);

	return entry;
}

/**
 * @param {any} value
 * @returns {UniversalCacheEntry}
 */
function create_resolved_entry(value) {
	return {
		settled: true,
		failed: false,
		value,
		error: undefined,
		promise: Promise.resolve(value)
	};
}

/**
 * Creates the server-side version of a (live) query resource. Within a request, results are cached
 * by their stringified argument, so that multiple calls only run the function once. The results
 * are serialized into the HTML during SSR so that the client can reuse them during hydration.
 *
 * @param {RequestStore | null} store
 * @param {UniversalInternals} internals
 * @param {string} payload
 * @param {() => any} get_value
 */
function create_server_resource(store, internals, payload, get_value) {
	/** @type {UniversalCacheEntry | undefined} */
	let local;

	const peek = () => (store ? get_entries(store, internals).get(payload) : local);

	const get_entry = () => {
		if (!store) return (local ??= create_entry(get_value));

		const entries = get_entries(store, internals);
		let entry = entries.get(payload);

		if (!entry) {
			entry = create_entry(() => run(store, get_value));
			entries.set(payload, entry);
		}

		return entry;
	};

	/** @param {UniversalCacheEntry} entry */
	const replace = (entry) => {
		if (store) {
			get_entries(store, internals).set(payload, entry);
		} else {
			local = entry;
		}
	};

	return {
		get then() {
			const promise = get_entry().promise;
			return promise.then.bind(promise);
		},
		get catch() {
			const promise = get_entry().promise;
			return promise.catch.bind(promise);
		},
		get finally() {
			const promise = get_entry().promise;
			return promise.finally.bind(promise);
		},
		get current() {
			const entry = peek();
			return entry?.settled && !entry.failed ? entry.value : undefined;
		},
		get error() {
			return undefined;
		},
		get loading() {
			return !peek()?.settled;
		},
		get ready() {
			const entry = peek();
			return !!entry?.settled && !entry.failed;
		},
		refresh() {
			const entry = create_entry(store ? () => run(store, get_value) : get_value);
			replace(entry);
			return entry.promise.then(noop);
		},
		/** @param {any} value */
		set(value) {
			replace(create_resolved_entry(value));
		},
		withOverride() {
			e.server_api_unavailable({ name: 'withOverride(...)' });
		},
		get [Symbol.toStringTag]() {
			return 'UniversalQuery';
		}
	};
}

// ---------------------------------------------------------------------------------------------
// query
// ---------------------------------------------------------------------------------------------

/**
 * Creates a universal query. It runs wherever it is called — on the server during SSR, and in the browser
 * after hydration — and its results are deduplicated by argument. Results computed during SSR are reused during hydration.
 *
 * @template Input
 * @template Output
 * @param {(arg: Input) => Output | Promise<Output>} fn
 * @returns {any}
 */
/*@__NO_SIDE_EFFECTS__*/
export function query(fn) {
	const __ = create_internals('query');

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const store = try_get_request_store();
		const payload = stringify_remote_arg(arg);

		return create_server_resource(store, __, payload, () => fn(arg));
	};

	return attach_internals(wrapper, __);
}

/**
 * @template Input
 * @template Output
 * @param {(args: Input[]) => ((arg: Input, idx: number) => Output) | Promise<(arg: Input, idx: number) => Output>} fn
 * @returns {any}
 */
/*@__NO_SIDE_EFFECTS__*/
function batch(fn) {
	const __ = create_internals('query_batch');

	/**
	 * @typedef {Map<string, { arg: Input, resolvers: Array<{ resolve: (value: any) => void, reject: (error: any) => void }> }>} Batch
	 */

	/**
	 * Pending batches per request
	 * @type {WeakMap<object, Batch>}
	 */
	const batches = new WeakMap();

	/**
	 * @param {RequestStore | null} store
	 * @param {Batch} batch
	 */
	const run_batch = async (store, batch) => {
		const entries = Array.from(batch.values());
		const args = entries.map((entry) => entry.arg);

		try {
			const get_result = await run(store, () => fn(args));

			entries.forEach((entry, i) => {
				try {
					const result = get_result(entry.arg, i);
					entry.resolvers.forEach((r) => r.resolve(result));
				} catch (error) {
					entry.resolvers.forEach((r) => r.reject(error));
				}
			});
		} catch (error) {
			for (const entry of entries) {
				entry.resolvers.forEach((r) => r.reject(error));
			}
		}
	};

	/**
	 * @param {RequestStore | null} store
	 * @param {Input} arg
	 * @param {string} payload
	 */
	const enqueue = (store, arg, payload) => {
		// outside of a request we don't batch, to not mix up calls from different contexts
		const scope = store?.state.universal ?? {};

		/** @type {Batch | undefined} */
		let batch = batches.get(scope);

		if (!batch) {
			/** @type {Batch} */
			const new_batch = new Map();
			batch = new_batch;
			batches.set(scope, new_batch);

			setTimeout(() => {
				batches.delete(scope);
				void run_batch(store, new_batch);
			}, 0);
		}

		const current = batch;

		return new Promise((resolve, reject) => {
			const existing = current.get(payload);

			if (existing) {
				existing.resolvers.push({ resolve, reject });
			} else {
				current.set(payload, { arg, resolvers: [{ resolve, reject }] });
			}
		});
	};

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const store = try_get_request_store();
		const payload = stringify_remote_arg(arg);

		return create_server_resource(store, __, payload, () => enqueue(store, arg, payload));
	};

	return attach_internals(wrapper, __);
}

/**
 * @template Input
 * @template Output
 * @param {(arg: Input) => AsyncIterable<Output> | Promise<AsyncIterable<Output>>} fn
 * @returns {any}
 */
/*@__NO_SIDE_EFFECTS__*/
function live(fn) {
	const __ = create_internals('query_live');

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const store = try_get_request_store();
		const payload = stringify_remote_arg(arg);

		// during SSR, the first yielded value is used (and serialized for hydration), then the iterator is closed
		const resource = create_server_resource(store, __, payload, async () => {
			const iterator = (await fn(arg))[Symbol.asyncIterator]();

			try {
				const { done, value } = await iterator.next();

				if (done) {
					throw new Error('Live query completed before yielding a value');
				}

				return value;
			} finally {
				await iterator.return?.();
			}
		});

		return Object.defineProperties(resource, {
			connected: { get: () => false },
			done: { get: () => false },
			reconnect: { value: () => resource.refresh() },
			[Symbol.asyncIterator]: {
				value: () => {
					/** @type {AsyncIterator<Output> | undefined} */
					let iterator;

					const get_iterator = async () =>
						(iterator ??= (await run(store, () => fn(arg)))[Symbol.asyncIterator]());

					return {
						next: async () => {
							const it = await get_iterator();
							return run(store, () => it.next());
						},
						/** @param {any} value */
						return: async (value) => {
							await iterator?.return?.(value);
							return { done: true, value };
						},
						[Symbol.asyncIterator]() {
							return this;
						}
					};
				}
			}
		});
	};

	return attach_internals(wrapper, __);
}

query.batch = batch;
query.live = live;

// ---------------------------------------------------------------------------------------------
// command
// ---------------------------------------------------------------------------------------------

/**
 * Creates a universal command. It runs wherever it is called.
 *
 * @template Input
 * @template Output
 * @param {(arg: Input) => Output | Promise<Output>} fn
 * @returns {any}
 */
/*@__NO_SIDE_EFFECTS__*/
export function command(fn) {
	const __ = create_internals('command');

	/** @param {Input} arg */
	const wrapper = (arg) => {
		const store = try_get_request_store();

		if (store?.state.is_in_render) {
			e.remote_command_render({ name: __.name || 'universal command' });
		}

		const promise = /** @type {Promise<Output> & { updates: () => Promise<Output> }} */ (
			Promise.resolve().then(() => run(store, () => fn(arg)))
		);

		// there's nothing to update on the server — queries are request-scoped
		promise.updates = () => promise;

		return promise;
	};

	Object.defineProperty(wrapper, 'pending', { get: () => 0 });

	return attach_internals(wrapper, __);
}

// ---------------------------------------------------------------------------------------------
// form
// ---------------------------------------------------------------------------------------------

/**
 * All exported universal forms, keyed by id. Used to look up the form when it is submitted without JavaScript.
 * @type {Map<string, any>}
 */
const forms = new Map();

/**
 * @param {string} id
 */
export function get_universal_form(id) {
	return forms.get(id);
}

/**
 * Creates a universal form. When JavaScript is available, the submission is handled in the browser.
 * Without JavaScript, the form is submitted to the server, which runs the same handler and renders the result.
 *
 * @param {any} validate_or_fn
 * @param {(data_or_issue: any, issue?: any) => any} [maybe_fn]
 * @returns {any}
 */
/*@__NO_SIDE_EFFECTS__*/
export function form(validate_or_fn, maybe_fn) {
	/** @type {any} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {StandardSchemaV1 | null} */
	const schema =
		!maybe_fn || validate_or_fn === 'unchecked' ? null : /** @type {any} */ (validate_or_fn);

	/** @type {UniversalInternals} */
	const base = create_internals('form');

	// the vite plugin assigns the id after the module was evaluated — use that to register the form
	let id = '';
	Object.defineProperty(base, 'id', {
		get: () => id,
		set: (value) => {
			id = value;
			forms.set(id, instance);
		}
	});

	/**
	 * @param {any} [key]
	 */
	function create_instance(key) {
		const get_action_id = () => get_form_action_id(base.id, key);

		/** @returns {UniversalFormOutput | undefined} */
		const get_output = () =>
			try_get_request_store()?.state.universal.form_outputs?.get(get_action_id());

		const instance = /** @type {Record<PropertyKey, any>} */ ({ method: 'POST' });

		Object.defineProperties(instance, {
			action: {
				get: () => {
					const store = try_get_request_store();
					const search = new URLSearchParams(
						store && !store.state.prerendering ? store.event.url.search : ''
					);
					search.delete(UNIVERSAL_ACTION_PARAM);

					const query = search.toString();
					const action_id =
						key === undefined ? base.id : `${base.id}/${encodeURIComponent(JSON.stringify(key))}`;

					return `?${query ? `${query}&` : ''}${UNIVERSAL_ACTION_PARAM}=${action_id}`;
				},
				enumerable: true
			},
			fields: {
				get: () =>
					create_field_proxy({
						form_id: base.id,
						get: () => get_output()?.input ?? {},
						set: (path, value) => {
							const store = try_get_request_store();
							if (!store) return;

							const outputs = (store.state.universal.form_outputs ??= new Map());
							const output = outputs.get(get_action_id()) ?? {};
							outputs.set(get_action_id(), output);

							if (path.length === 0) {
								output.input = value;
							} else {
								deep_set((output.input ??= {}), path.map(String), value);
							}
						},
						get_issues: () => flatten_issues(get_output()?.issues ?? []),
						get_touched: () => ({}),
						get_dirty: () => ({})
					})
			},
			result: {
				get: () => get_output()?.result
			},
			pending: {
				get: () => 0
			},
			submitted: {
				get: () => !!get_output()?.issues || get_output()?.result !== undefined
			},
			element: {
				get: () => null
			},
			enhance: {
				value: () => ({ method: instance.method, action: instance.action })
			},
			validate: {
				value: () => e.server_api_unavailable({ name: 'form.validate()' })
			},
			submit: {
				value: () => e.server_api_unavailable({ name: 'form.submit()' })
			},
			/**
			 * Used by the server runtime to handle non-enhanced submissions.
			 * @type {PropertyDescriptor}
			 */
			__handle: {
				/**
				 * @param {Record<string, any>} data
				 * @param {RequestStore} store
				 */
				value: async (data, store) => {
					const output = await run(store, () =>
						run_form_handler(schema, fn, !!maybe_fn, data, true)
					);

					if (output.issues) {
						output.input = redact_input(data);
					}

					(store.state.universal.form_outputs ??= new Map()).set(get_action_id(), output);

					return output;
				}
			}
		});

		return instance;
	}

	const instance = create_instance();

	Object.defineProperty(instance, 'for', {
		/** @param {any} key */
		value: (key) => {
			const store = try_get_request_store();
			if (!store) return create_instance(key);

			// keyed instances are cached per request, like everything else on the server
			const keyed = (store.state.universal.keyed_forms ??= new Map());
			const cache_key = base.id + '|' + JSON.stringify(key);
			let keyed_instance = keyed.get(cache_key);

			if (!keyed_instance) {
				keyed_instance = create_instance(key);
				keyed.set(cache_key, keyed_instance);
			}

			return keyed_instance;
		}
	});

	// the vite plugin looks for `__universal` on the exported value — point it at the base internals
	Object.defineProperty(instance, UNIVERSAL, { value: base });

	return instance;
}
