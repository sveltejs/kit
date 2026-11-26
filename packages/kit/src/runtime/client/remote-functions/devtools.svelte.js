// internal and dev only, lets the sveltekit devtool read live remote function state
// each export checks DEV too, the bundler keeps cross chunk exports whose only callers are dead branches
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { parse_remote_arg, split_remote_key } from '../../shared.js';

/** @typedef {'ssr' | 'fetch' | 'mutation' | 'set'} QuerySource */

/**
 * @typedef {{
 *   key: string;
 *   id: string;
 *   name: string;
 *   arg: unknown;
 *   status: 'loading' | 'ready' | 'refreshing' | 'error';
 *   value: unknown;
 *   error: App.Error | undefined;
 *   overrides: number;
 *   source: QuerySource | null;
 *   refs: number;
 *   created: number;
 *   updated: number;
 * }} QuerySnapshot
 */

/**
 * @typedef {{ type: 'command' | 'form', mutation: number, id: string, name: string }} Mutation
 * @typedef {{ time: number } & (
 *   | { type: 'query:created' | 'query:updated', query: QuerySnapshot }
 *   | { type: 'query:removed', key: string }
 *   | { type: 'mutation:started', mutation: Mutation, arg: unknown, refreshes: string[], overrides: string[] }
 *   | { type: 'mutation:settled', mutation: Mutation, ok: boolean, result?: unknown, error?: unknown, issues?: unknown[], updated: string[], duration: number }
 * )} DevtoolsEvent
 */

/**
 * @typedef {{
 *   read: () => Pick<QuerySnapshot, 'status' | 'value' | 'error' | 'overrides'>;
 * }} Inspector
 */

/** @type {Set<(event: DevtoolsEvent) => void>} */
const listeners = new Set();

/** @type {Map<string, { inspector: Inspector, source: QuerySource | null, created: number, updated: number }>} */
const resources = new Map();

/** set by install_hook so this module does not import client.js */
let runtime =
	/** @type {{ app: () => { encoders: Record<string, (value: any) => any> } | undefined, query_map: Map<string, Map<string, { proxy_count: number }>> } | null} */ (
		null
	);

/** @type {{ listening: boolean } | null} */
let reactive = null;

function get_reactive() {
	if (!reactive) {
		const state = $state({ listening: false });
		reactive = state;
	}
	return reactive;
}

/** the only check made when no devtool is attached */
export function listening() {
	return DEV && listeners.size > 0;
}

/** reactive, so resources start reporting when a devtool attaches */
export function listening_reactive() {
	return DEV && get_reactive().listening;
}

function now() {
	return performance.timeOrigin + performance.now();
}

/** @param {any} event */
function emit(event) {
	const e = { ...event, time: now() };
	for (const listener of listeners) {
		try {
			listener(e);
		} catch (error) {
			console.error(error);
		}
	}
}

/**
 * @param {string} key
 * @param {Inspector} inspector
 */
export function register_resource(key, inspector) {
	if (!DEV) return;
	resources.set(key, { inspector, source: null, created: now(), updated: now() });
	if (listening()) emit({ type: 'query:created', query: snapshot(key) });
}

/** @param {string} key */
export function unregister_resource(key) {
	if (!DEV) return;
	if (resources.delete(key) && listening()) emit({ type: 'query:removed', key });
}

/**
 * @param {string} key
 */
export function resource_changed(key) {
	if (!DEV) return;
	const record = resources.get(key);
	if (!record) return;
	record.updated = now();
	if (listening()) emit({ type: 'query:updated', query: snapshot(key) });
}

/**
 * call after writing the value, the change is reported on the next flush
 * @param {string} key
 * @param {QuerySource} source
 */
export function set_source(key, source) {
	if (!DEV) return;
	const record = resources.get(key);
	if (record) record.source = source;
}

/**
 * @param {string} key
 * @returns {QuerySnapshot}
 */
function snapshot(key) {
	const record = /** @type {NonNullable<ReturnType<typeof resources.get>>} */ (resources.get(key));
	const { id, payload } = split_remote_key(key);

	/** @type {unknown} */
	let arg;
	try {
		arg = parse_remote_arg(payload);
	} catch {
		// an undecodable payload still has a key
	}

	return {
		key,
		id,
		name: id.slice(id.lastIndexOf('/') + 1),
		arg,
		...record.inspector.read(),
		source: record.source,
		refs: runtime?.query_map.get(id)?.get(payload)?.proxy_count ?? 0,
		created: record.created,
		updated: record.updated
	};
}

let mutation_counter = 0;

/**
 * @param {'command' | 'form'} type
 * @param {string} id
 * @param {unknown} arg
 * @param {Set<string> | null} refreshes
 * @param {string[]} overrides keys of the queries whose overrides are released when this settles
 * @returns {{ mutation: Mutation, start: number }}
 */
export function mutation_started(type, id, arg, refreshes, overrides) {
	if (!DEV) return /** @type {any} */ (null);
	const mutation = {
		type,
		mutation: ++mutation_counter,
		id,
		name: id.slice(id.lastIndexOf('/') + 1)
	};

	emit({
		type: 'mutation:started',
		mutation,
		arg,
		refreshes: Array.from(refreshes ?? []),
		overrides
	});

	return { mutation, start: now() };
}

/**
 * @param {{ mutation: Mutation, start: number }} started
 * @param {{ ok: boolean, result?: unknown, error?: unknown, issues?: unknown[], data?: { q?: object, l?: object } }} outcome
 */
export function mutation_settled(started, { data, ...outcome }) {
	if (!DEV) return;
	emit({
		type: 'mutation:settled',
		mutation: started.mutation,
		...outcome,
		// single flight updates in the response
		updated: [...Object.keys(data?.q ?? {}), ...Object.keys(data?.l ?? {})],
		duration: now() - started.start
	});
}

export const HOOK_NAME = '__SVELTEKIT_DEVTOOLS__';
export const READY_EVENT = 'sveltekit:devtools';

/**
 * idempotent, embedded apps share one query cache and so one hook
 * @param {NonNullable<typeof runtime>} options
 */
export function install_hook(options) {
	if (!DEV || runtime || typeof window === 'undefined') return;
	runtime = options;

	const hook = {
		/** @param {(event: DevtoolsEvent) => void} listener */
		subscribe(listener) {
			listeners.add(listener);
			get_reactive().listening = true;

			return () => {
				listeners.delete(listener);
				if (listeners.size === 0) get_reactive().listening = false;
			};
		},
		/** call after subscribe to get the current state */
		queries() {
			return Array.from(resources.keys(), snapshot);
		},
		/**
		 * serialize with the app transport encoders to post to a panel
		 * @param {unknown} value
		 */
		serialize(value) {
			return devalue.stringify(value, runtime?.app()?.encoders ?? {});
		}
	};

	Object.defineProperty(window, HOOK_NAME, { value: hook, configurable: true });
	window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: hook }));
}
