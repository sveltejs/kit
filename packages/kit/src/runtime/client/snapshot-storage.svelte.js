import { DEV } from 'esm-env';
import { SNAPSHOT_KEY } from './constants.js';
import * as storage from './session-storage.js';

const STORE = 'snapshots';

/**
 * `sessionStorage` key under which the current browsing session's id is kept.
 * `sessionStorage` is per-tab and cleared when the tab is closed, but survives
 * reloads — exactly the lifetime we want snapshots (which may contain large
 * `File`/`Blob` objects) to have.
 */
const SESSION_KEY = SNAPSHOT_KEY + ':session';

/**
 * Prefix for the Web Locks we hold, one per browsing session. A held lock named
 * `session:<id>` signals that the tab owning `<id>` is still alive; the lock is
 * released automatically by the browser when that tab is closed or crashes, so
 * the set of currently-held `session:*` locks is an accurate, self-cleaning
 * record of which sessions' snapshots are still needed.
 */
const LOCK_PREFIX = 'session:';

/**
 * In-memory map of snapshots for the current session, populated once from
 * IndexedDB during client initialisation (see `init`) so that restores stay
 * synchronous
 *
 * @type {Record<string, any[]>}
 */
const snapshots = {};

/** @type {Promise<IDBDatabase> | null} */
let db_promise = null;

/** @type {string | undefined} */
let session;

let failed = false;
let warned = false;

/**
 * The id for the current browsing session. Persisted in `sessionStorage` so it
 * survives reloads (allowing snapshots to be restored) but is scoped to the tab
 * and discarded when the tab is closed.
 *
 * The first time it is resolved we also (fire-and-forget) acquire an exclusive
 * Web Lock named `session:<id>` that is held for the lifetime of the tab, so
 * other tabs can tell this session is still active when pruning stale data.
 *
 * @returns {string}
 */
function get_session() {
	if (session === undefined) {
		session = storage.get(SESSION_KEY, (value) => value);

		if (!session) {
			session =
				typeof crypto !== 'undefined' && crypto.randomUUID
					? crypto.randomUUID()
					: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

			storage.set(SESSION_KEY, session, (value) => value);
		}

		if (typeof navigator !== 'undefined' && navigator.locks) {
			// Hold the lock for the lifetime of the tab; it is released
			// automatically when the tab is closed or crashes. The callback
			// promise intentionally never resolves — do NOT await this.
			navigator.locks
				.request(`${LOCK_PREFIX}${session}`, { mode: 'exclusive' }, () => new Promise(() => {}))
				.catch(() => {
					// best-effort; if the lock can't be acquired we simply won't
					// advertise this session as active (pruning stays conservative)
				});
		}
	}

	return session;
}

/**
 * The set of session ids that are still active, derived from the currently-held
 * `session:*` Web Locks. The current session is always included, because
 * `navigator.locks.query()` may run before this tab's own lock has been granted
 * (the request is async), and we must never prune our own snapshots.
 *
 * Returns `null` when the Web Locks API is unavailable — in that case we cannot
 * prove any other session is stale, so callers must not prune.
 *
 * @param {string} current
 * @returns {Promise<Set<string> | null>}
 */
async function get_active_sessions(current) {
	if (typeof navigator === 'undefined' || !navigator.locks || !navigator.locks.query) {
		return null;
	}

	const active = new Set([current]);

	try {
		const { held = [] } = await navigator.locks.query();
		for (const lock of held) {
			if (lock.name && lock.name.startsWith(LOCK_PREFIX)) {
				active.add(lock.name.slice(LOCK_PREFIX.length));
			}
		}
	} catch {
		// if the query fails we still know the current session is active
	}

	return active;
}

/** @returns {Promise<IDBDatabase>} */
function open() {
	return (db_promise ??= new Promise((resolve, reject) => {
		/** @type {IDBOpenDBRequest} */
		const request = indexedDB.open(SNAPSHOT_KEY, 1);

		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE);
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	}));
}

/**
 * Load the current session's snapshots into an in-memory map keyed by
 * navigation index, and prune snapshots belonging to sessions whose tabs are no
 * longer alive (determined via the Web Locks API) so they don't accumulate
 * indefinitely.
 */
export async function init() {
	try {
		const db = await open();
		const current = get_session();

		// `null` means we can't prove any session is stale (no Web Locks API),
		// so we must not delete other sessions' data.
		const active = await get_active_sessions(current);

		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readwrite');
				const store = transaction.objectStore(STORE);
				const request = store.openCursor();
				request.onsuccess = () => {
					const cursor = request.result;
					if (cursor) {
						const key = /** @type {[string, number]} */ (cursor.key);
						if (Array.isArray(key) && key[0] === current) {
							// only load the current session's snapshots into memory
							snapshots[/** @type {number} */ (key[1])] = cursor.value;
						} else if (active && !(Array.isArray(key) && active.has(key[0]))) {
							// stale (closed session) or legacy (non-namespaced) entry —
							// only delete when Web Locks let us prove it isn't active
							cursor.delete();
						}
						cursor.continue();
					}
				};
				request.onerror = () => reject(request.error);
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			})
		);
	} catch {
		failed = true;

		// fall back to sessionStorage
		Object.assign(snapshots, storage.get(SNAPSHOT_KEY));
	}
}

/**
 * Persist a snapshot value for a given navigation index in memory,
 * and (in the background, fire-and-forget style) to IndexedDB
 *
 * @param {number} index
 * @param {any} value
 */
export function set(index, value) {
	snapshots[index] = $state.snapshot(value);

	void put(index, snapshots[index]);
	storage.set(SNAPSHOT_KEY, snapshots);
}

/**
 * @param {number} index
 */
export function get(index) {
	if (DEV && failed && !warned) {
		warned = true;
		console.warn('Failed to restore snapshots from IndexedDB');
	}

	return snapshots[index];
}

/**
 * @param {number} index
 */
export function truncate(index) {
	let i = index;

	while (snapshots[++i]) {
		delete snapshots[i];
		void del(i);
	}

	storage.set(SNAPSHOT_KEY, snapshots);
}

/**
 * Persist a snapshot value to IndexedDB
 *
 * @param {number} index
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function put(index, value) {
	try {
		const db = await open();
		const current = get_session();
		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readwrite');
				transaction.objectStore(STORE).put(value, [current, index]);
				// Flush promptly so that writes initiated from `visibilitychange`
				// (the last reliable signal before unload) have the best chance to
				// land before the document is destroyed. Auto-commit would otherwise
				// wait for the current task to unwind.
				if (typeof transaction.commit === 'function') transaction.commit();
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			})
		);
	} catch (e) {
		if (DEV && /** @type {Error} */ (e).name === 'DataCloneError') {
			console.warn('Could not serialize snapshot value. It will not survive a page reload');
		}
	}
}

/**
 * Delete the snapshot value for a given navigation index.
 *
 * @param {number} index
 * @returns {Promise<void>}
 */
async function del(index) {
	try {
		const db = await open();
		const current = get_session();
		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readwrite');
				transaction.objectStore(STORE).delete([current, index]);
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			})
		);
	} catch {
		// best-effort
	}
}
