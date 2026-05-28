/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState, SSROptions } from 'types' */
import * as devalue from 'devalue';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { REMOTE_QUERY_RESOURCE } from '../shared.js';
import { handle_error_and_jsonify } from './utils.js';
import { noop } from '../../utils/functions.js';

/**
 * Built-in transport key for serialized `RemoteQuery` instances. Encoded
 * shape is `[id, arg, data, error?, status?]`. The encoder runs during
 * `devalue.stringify` and reads from a per-call `WeakMap` populated by
 * `pre_resolve_queries`; the decoder runs on the client and reconstructs
 * a `QueryProxy` whose underlying `Query` is pre-seeded with the inlined
 * value.
 */
export const REMOTE_QUERY_TRANSPORT_KEY = '__skq';

/**
 * Walk `value` and any nested arrays / plain objects / Maps / Sets,
 * awaiting every server-side `RemoteQuery` resource we encounter (detected
 * via the `REMOTE_QUERY_RESOURCE` brand). Each awaited resource is
 * recorded in the returned `WeakMap` under its identity along with its
 * resolved data (or jsonified error). A cycle guard prevents infinite
 * recursion through self-referential structures.
 *
 * After this returns, the in-memory tree still contains the original
 * resource references; `stringify_with_remote_queries` looks them up in
 * the `WeakMap` via the `__skq` encoder and inlines `[id, arg, data, ...]`.
 *
 * @param {any} value
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions | undefined} options
 * @returns {Promise<WeakMap<object, { id: string; arg: any; data?: any; error?: any; status?: number }>>}
 */
export async function pre_resolve_queries(value, event, state, options) {
	/** @type {WeakMap<object, { id: string; arg: any; data?: any; error?: any; status?: number }>} */
	const resolved = new WeakMap();

	/** @type {WeakSet<object>} */
	const seen = new WeakSet();

	/** @type {Promise<void>[]} */
	const pending = [];

	/**
	 * @param {any} v
	 */
	const walk = (v) => {
		if (v === null || typeof v !== 'object') return;
		if (seen.has(v)) return;
		seen.add(v);

		// Recognize a branded server-side RemoteQuery resource. We deliberately
		// don't recurse *into* its accessors (the resource exposes `current`,
		// `error`, etc. as getters that would re-trigger work); instead we
		// `await` the resource itself and record the resolved value.
		const brand = /** @type {{ id: string; arg: any } | undefined} */ (v[REMOTE_QUERY_RESOURCE]);
		if (brand) {
			if (resolved.has(v)) return;
			// Reserve the slot so a re-entrant walk doesn't enqueue twice
			resolved.set(v, { id: brand.id, arg: brand.arg });
			pending.push(
				Promise.resolve(v)
					.then(
						(data) => {
							const entry = /** @type {NonNullable<ReturnType<typeof resolved.get>>} */ (
								resolved.get(v)
							);
							entry.data = data;
							// Resolved values may themselves contain nested resources;
							// walk them too so they round-trip end-to-end.
							walk(data);
						},
						async (error) => {
							const entry = /** @type {NonNullable<ReturnType<typeof resolved.get>>} */ (
								resolved.get(v)
							);
							entry.error = options
								? await handle_error_and_jsonify(event, state, options, error)
								: { message: error instanceof Error ? error.message : 'Unknown Error' };
							entry.status =
								error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;
						}
					)
					.catch(noop)
			);
			return;
		}

		if (Array.isArray(v)) {
			for (const item of v) walk(item);
			return;
		}

		if (v instanceof Map) {
			for (const item of v.values()) walk(item);
			return;
		}

		if (v instanceof Set) {
			for (const item of v) walk(item);
			return;
		}

		// Only recurse into plain objects to avoid surprising behavior with
		// class instances. Devalue treats class instances as opaque and won't
		// look inside them either, so we match that.
		const proto = Object.getPrototypeOf(v);
		if (proto === null || proto === Object.prototype) {
			for (const key of Object.keys(v)) walk(v[key]);
		}
	};

	walk(value);

	// Resolving one resource may surface another (via the nested-walk in
	// the then-callback). Loop until the pending queue settles.
	while (pending.length > 0) {
		const batch = pending.splice(0);
		await Promise.all(batch);
	}

	return resolved;
}

/**
 * `devalue.stringify` with a built-in encoder for `RemoteQuery` resources.
 * The encoder looks each resource up in `resolved` (populated by
 * `pre_resolve_queries`) and emits the wire shape `[id, arg, data, error?, status?]`.
 *
 * @param {any} value
 * @param {Record<string, import('@sveltejs/kit').Transporter>} transport
 * @param {WeakMap<object, { id: string; arg: any; data?: any; error?: any; status?: number }>} resolved
 */
export function stringify_with_remote_queries(value, transport, resolved) {
	/** @type {Record<string, (value: unknown) => unknown>} */
	const encoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.encode]));

	encoders[REMOTE_QUERY_TRANSPORT_KEY] = (v) => {
		if (v === null || typeof v !== 'object') return false;
		const entry = resolved.get(/** @type {object} */ (v));
		if (!entry) return false;
		if (entry.error !== undefined) {
			return [entry.id, entry.arg, undefined, entry.error, entry.status];
		}
		return [entry.id, entry.arg, entry.data];
	};

	return devalue.stringify(value, encoders);
}

/**
 * Pre-resolve any nested `RemoteQuery` instances in `value`, then
 * serialize the whole structure with the built-in `__skq` codec.
 *
 * @param {any} value
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 */
export async function stringify_remote_response(value, event, state, options) {
	const resolved = await pre_resolve_queries(value, event, state, options);
	return stringify_with_remote_queries(value, options.hooks.transport, resolved);
}
