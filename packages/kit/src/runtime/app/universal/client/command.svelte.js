import { attach_internals, create_internals } from '../shared.js';
import { categorize_updates, refresh_resources } from './updates.js';

/**
 * Client-side version of `command` from `$app/universal`.
 * @template Input
 * @template Output
 * @param {(arg: Input) => Output | Promise<Output>} fn
 */
export function command(fn) {
	const __ = create_internals('command');

	let pending_count = $state(0);

	/** @param {Input} arg */
	const wrapper = (arg) => {
		let updates = /** @type {ReturnType<typeof categorize_updates> | null} */ (null);

		/** @type {unknown} */
		let updates_error;

		pending_count++;

		const promise =
			/** @type {Promise<Output> & { updates: (...args: any[]) => Promise<Output> }} */ (
				(async () => {
					try {
						// give `.updates(...)` a chance to be called
						await Promise.resolve();

						if (updates_error) throw updates_error;

						const result = await fn(arg);

						if (updates) {
							await refresh_resources(updates.resources);
						}

						return result;
					} finally {
						// release optimistic updates (after the refreshed data arrived, to prevent flickering)
						updates?.overrides.forEach((release) => release());
						pending_count--;
					}
				})()
			);

		let updates_called = false;

		promise.updates = (...args) => {
			if (updates_called) return promise;
			updates_called = true;

			try {
				updates = categorize_updates(args);
			} catch (error) {
				updates_error = error;
			}

			return promise;
		};

		return promise;
	};

	Object.defineProperty(wrapper, 'pending', { get: () => pending_count });

	return attach_internals(wrapper, __);
}
