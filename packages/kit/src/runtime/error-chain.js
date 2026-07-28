/** @import { Component } from 'svelte'; */

/**
 * Resolves the `+error.svelte` component that guards each node of `branch`, aligned to the
 * branch with its empty slots removed. A node is guarded by the closest error page declared
 * at or above it, except the root layout, which wraps the root error component rather than
 * being wrapped by it. The client and the server must agree on this, or the same render
 * error produces a different error page depending on whether it happened during SSR.
 * @template T
 * @param {Array<unknown>} branch
 * @param {Array<T | undefined | null>} errors the error page declared at each depth, if any
 * @param {(error: T) => Promise<Component | undefined> | undefined} load
 * @returns {Promise<Array<Component | undefined>>}
 */
export function build_error_chain(branch, errors, load) {
	let last_idx = -1;

	return Promise.all(
		// depths with no error page contribute `undefined` rather than a promise
		// eslint-disable-next-line @typescript-eslint/await-thenable
		branch
			.map((node, i) => {
				if (i === 0) return undefined;
				if (!node) return null;

				i -= 1;
				while (i > last_idx + 1 && errors[i] == null) i -= 1;
				last_idx = i;

				const error = errors[i];
				return error == null ? undefined : load(error)?.catch(() => undefined);
			})
			// drop the empty slots, keep the depths that simply have no error page
			.filter((component) => component !== null)
	);
}
