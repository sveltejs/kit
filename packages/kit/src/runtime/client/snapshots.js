import { BROWSER, DEV } from 'esm-env';
import { onMount } from 'svelte';
import * as storage from './session-storage.js';
import { NAVIGATION_SNAPSHOT_KEY } from './constants.js';
import { hash } from '../../utils/hash.js';
import { parse, stringify } from '#app/internal/transport';

/**
 * @typedef {{ id: string; capture: () => any; restore: (value: any) => void; reset?: () => void }} SnapshotRegistration
 */

// Function snapshots use history indexes so shallow entries have distinct state.
/** @type {Record<string, Record<string, string>>} */
const navigation_snapshots = storage.get(NAVIGATION_SNAPSHOT_KEY) ?? {};

/** @type {Set<SnapshotRegistration>} */
const snapshot_registrations = new Set();

/**
 * The registrations mounted right now. Take before navigating and pass to
 * `restore_navigation_snapshot` — only these are eligible for `reset`.
 * @returns {Set<SnapshotRegistration>}
 */
export function current_registrations() {
	return new Set(snapshot_registrations);
}

// injected by client.js: the live history index while the router is idle, null mid-navigation
/** @type {() => number | null} */
let get_idle_history_index = () => null;

/** @param {() => number | null} fn */
export function init_snapshots(fn) {
	get_idle_history_index = fn;
}

/** @param {number} index */
export function capture_navigation_snapshot(index) {
	if (snapshot_registrations.size === 0) {
		delete navigation_snapshots[index];
		return;
	}

	navigation_snapshots[index] = Object.fromEntries(
		Array.from(snapshot_registrations, ({ id, capture }) => [id, stringify(capture())])
	);
}

/**
 * @param {number} index
 * @param {Set<SnapshotRegistration>} [reset_registrations]
 */
export function restore_navigation_snapshot(index, reset_registrations) {
	const values = navigation_snapshots[index];

	for (const registration of snapshot_registrations) {
		if (values && Object.hasOwn(values, registration.id)) {
			registration.restore(parse(values[registration.id]));
		} else if (reset_registrations?.has(registration)) {
			registration.reset?.();
		}
	}
}

/** @param {number} index */
export function delete_navigation_snapshot(index) {
	delete navigation_snapshots[index];
}

/** @param {number} index */
export function persist_navigation_snapshots(index) {
	capture_navigation_snapshot(index);
	storage.set(NAVIGATION_SNAPSHOT_KEY, navigation_snapshots);
}

/**
 * @param {string | undefined} stack
 * @returns {string}
 */
function callsite_id(stack) {
	let frames = stack?.split('\n') ?? [];
	if (frames[0]?.trim() === 'Error') frames = frames.slice(1);

	// only the callsite frame is stable: frames above it differ between hydration and
	// re-mounting, and Vite query strings (stripped here) change on module invalidation
	const frame = frames[1]?.replace(/\?[^)\s]*(?=:\d+:\d+\)?$)/, '');

	if (!frame) {
		throw new Error('Could not generate a snapshot id from the stack trace. Pass an `id` instead.');
	}

	return hash(frame);
}

/**
 * A lifecycle function that captures state before navigating and restores it when traversing history.
 *
 * By default, the snapshot `id` is generated from the call site. Pass an explicit `id` to keep snapshots stable across deployments or distinguish multiple uses of a shared helper.
 *
 * The optional `reset` callback runs on navigations where there is no captured value to restore, such as when a new history entry is created. Captured values are serialized with the app's transport hook.
 *
 * `snapshot` must be called during a component initialization. It remains active as long as the component is mounted.
 * @template T
 * @param {{ id?: string; capture: () => T; restore: (value: T) => void; reset?: () => void }} options
 * @returns {void}
 */
export function snapshot(options) {
	if (!BROWSER) return;

	let id = options.id;
	if (id === undefined) {
		// restore any lowered third-party limit, else every callsite collapses to one id
		const limit = Error.stackTraceLimit;
		const lowered = typeof limit === 'number' && limit < 3;
		if (lowered) Error.stackTraceLimit = 3;
		const stack = new Error().stack;
		if (lowered) Error.stackTraceLimit = limit;

		id = callsite_id(stack);
	}

	const registration = { ...options, id };

	onMount(() => {
		if (DEV && Array.from(snapshot_registrations).some((existing) => existing.id === id)) {
			throw new Error(
				options.id === undefined
					? 'snapshot() was called multiple times from the same call site. Pass a unique `id` to distinguish the instances.'
					: `A snapshot with id "${options.id}" is already registered. Pass a unique \`id\`.`
			);
		}

		const index = get_idle_history_index();
		if (index !== null) {
			const values = navigation_snapshots[index];
			if (values && Object.hasOwn(values, id)) {
				registration.restore(parse(values[id]));
			}
		}

		snapshot_registrations.add(registration);

		return () => {
			snapshot_registrations.delete(registration);
		};
	});
}
