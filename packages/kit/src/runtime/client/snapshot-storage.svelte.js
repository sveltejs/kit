import { DEV } from 'esm-env';
import { SNAPSHOT_KEY } from './constants.js';
import * as storage from './session-storage.js';

const STORE = 'snapshots';

/**
 * In-memory map of snapshots, populated once from IndexedDB during client
 * initialisation (see `initialize`) so that restores stay synchronous
 *
 * @type {Record<string, any[]>}
 */
const snapshots = {};

/** @type {Promise<IDBDatabase> | null} */
let db_promise = null;

let failed = false;
let warned = false;

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
 * Load all snapshots into an in-memory map keyed by navigation index.
 */
export async function init() {
	try {
		const db = await open();
		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readonly');
				const request = transaction.objectStore(STORE).openCursor();
				request.onsuccess = () => {
					const cursor = request.result;
					if (cursor) {
						snapshots[/** @type {number} */ (cursor.key)] = cursor.value;
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
		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readwrite');
				transaction.objectStore(STORE).put(value, index);
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
		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readwrite');
				transaction.objectStore(STORE).delete(index);
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			})
		);
	} catch {
		// best-effort
	}
}
