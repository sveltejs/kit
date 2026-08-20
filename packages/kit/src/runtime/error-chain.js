/** @import { Component } from 'svelte'; */

/**
 * Resolves the `+error.svelte` component that guards each node of `branch`, aligned to the
 * branch with its empty slots removed. A node is guarded by the closest error page declared
 * at or above it, except the root layout, which wraps the root error component rather than
 * being wrapped by it.
 * @template T
 * @param {Array<unknown>} branch
 * @param {Array<T | undefined | null>} errors the error page declared at each depth, if any
 * @param {(error: T) => Promise<Component | undefined> | undefined} load
 * @returns {Promise<Array<Component | undefined>>}
 */
export function build_error_chain(branch, errors, load) {
	/** @type {Array<Promise<Component | undefined> | undefined>} */
	const chain = [undefined];
	let last_idx = -1;

	for (let i = 1; i < branch.length; i += 1) {
		if (!branch[i]) continue;

		let j = i - 1;
		while (j > last_idx + 1 && errors[j] == null) j -= 1;
		last_idx = j;

		const error = errors[j];
		chain.push(error == null ? undefined : load(error)?.catch(() => undefined));
	}

	// depths with no error page contribute `undefined` rather than a promise
	// eslint-disable-next-line @typescript-eslint/await-thenable
	return Promise.all(chain);
}

/**
 * Walks up from the node at index `i` through the `+error.svelte` pages declared strictly
 * above it, nearest first. Yields each candidate with the branch depth it attaches at,
 * rewound past empty branch slots, so callers can skip candidates that fail to load.
 * @template T
 * @param {number} i
 * @param {Array<unknown>} branch
 * @param {Array<T | undefined | null>} errors the error page declared at each depth, if any
 * @returns {Generator<{ error: T; idx: number }>}
 */
export function* nearest_error_pages(i, branch, errors) {
	while (i--) {
		const error = errors[i];
		if (error != null) {
			let j = i;
			while (!branch[j]) j -= 1;
			yield { error, idx: j + 1 };
		}
	}
}
