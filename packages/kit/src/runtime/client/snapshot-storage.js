import { SNAPSHOT_KEY } from './constants.js';

const STORE = 'snapshots';

/** @type {Promise<IDBDatabase> | null} */
let db_promise = null;

/** @returns {Promise<IDBDatabase>} */
function open() {
	if (db_promise) return db_promise;

	db_promise = new Promise((resolve, reject) => {
		/** @type {IDBOpenDBRequest} */
		const request = indexedDB.open(SNAPSHOT_KEY, 1);

		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE);
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

	return db_promise;
}

/**
 * Load all snapshots into an in-memory map keyed by navigation index.
 *
 * Values are stored via the structured clone algorithm, so `File`/`Blob`/`Map`/
 * `Set`/cyclic structures etc. are supported without serialization. Call this
 * once during client initialisation (before any `restore_snapshot`) so that
 * restores can stay synchronous.
 *
 * @returns {Promise<Record<number, any>>}
 */
export async function load_all() {
	/** @type {Record<number, any>} */
	const result = {};

	try {
		const db = await open();
		await /** @type {Promise<void>} */ (
			new Promise((resolve, reject) => {
				const transaction = db.transaction(STORE, 'readonly');
				const request = transaction.objectStore(STORE).openCursor();
				request.onsuccess = () => {
					const cursor = request.result;
					if (cursor) {
						result[/** @type {number} */ (cursor.key)] = cursor.value;
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
		// IndexedDB may be unavailable (e.g. private browsing) — return what we have
	}

	return result;
}

/**
 * Persist a snapshot value for a given navigation index.
 *
 * Values are stored via the structured clone algorithm, so `File`/`Blob`/`Map`/
 * `Set`/cyclic structures etc. are supported without serialization. The returned
 * promise resolves once the write is durable; callers that fire-and-forget
 * (e.g. the navigation capture path, where the page stays alive) may ignore it.
 *
 * @param {number} index
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function set(index, value) {
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
	} catch {
		// snapshot persistence is best-effort
	}
}

/**
 * Delete the snapshot value for a given navigation index.
 *
 * @param {number} index
 * @returns {Promise<void>}
 */
export async function del(index) {
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
